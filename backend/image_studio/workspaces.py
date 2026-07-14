import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from .assets import serialize_asset
from .auth import get_current_user


router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    favorite: bool | None = None


def owned_workspace(request: Request, workspace_id: str, user_id: str):
    with request.app.state.db.connect() as connection:
        row = connection.execute(
            "SELECT * FROM workspaces WHERE id=? AND user_id=?", (workspace_id, user_id)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="会话不存在")
    return row


def serialize_workspace(request: Request, row, detailed: bool = False) -> dict:
    with request.app.state.db.connect() as connection:
        count = connection.execute(
            "SELECT COUNT(*) FROM assets WHERE workspace_id=? AND kind='generated'", (row["id"],)
        ).fetchone()[0]
        latest = connection.execute(
            "SELECT id FROM assets WHERE workspace_id=? AND kind='generated' ORDER BY created_at DESC LIMIT 1",
            (row["id"],),
        ).fetchone()
    result = {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "favorite": bool(row["favorite"]),
        "image_count": count,
        "latest_asset_id": latest["id"] if latest else None,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if detailed:
        with request.app.state.db.connect() as connection:
            run_rows = connection.execute(
                "SELECT * FROM runs WHERE workspace_id=? ORDER BY created_at DESC", (row["id"],)
            ).fetchall()
            asset_rows = connection.execute(
                "SELECT * FROM assets WHERE workspace_id=? ORDER BY created_at DESC", (row["id"],)
            ).fetchall()
        assets_by_run: dict[str | None, list] = {}
        for asset in asset_rows:
            assets_by_run.setdefault(asset["run_id"], []).append(serialize_asset(asset))
        result["runs"] = [
            {
                "id": run["id"],
                "prompt": run["prompt"],
                "model": run["model"],
                "provider_id": run["provider_id"],
                "params": json.loads(run["params_json"]),
                "status": run["status"],
                "error": run["error"],
                "created_at": run["created_at"],
                "assets": assets_by_run.get(run["id"], []),
            }
            for run in run_rows
        ]
    return result


@router.get("")
def list_workspaces(request: Request, user=Depends(get_current_user)):
    with request.app.state.db.connect() as connection:
        rows = connection.execute(
            "SELECT * FROM workspaces WHERE user_id=? ORDER BY updated_at DESC", (user["id"],)
        ).fetchall()
    return [serialize_workspace(request, row) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceInput, request: Request, user=Depends(get_current_user)):
    with request.app.state.db.connect() as connection:
        used = connection.execute(
            "SELECT COUNT(*) FROM workspaces WHERE user_id=?", (user["id"],)
        ).fetchone()[0]
    if used >= 100:
        raise HTTPException(
            status_code=409,
            detail={"code": "conversation_quota_exceeded", "used": used, "limit": 100},
        )
    workspace_id = str(uuid.uuid4())
    with request.app.state.db.connect() as connection:
        connection.execute(
            "INSERT INTO workspaces(id,user_id,name) VALUES(?,?,?)",
            (workspace_id, user["id"], payload.name.strip()),
        )
        row = connection.execute("SELECT * FROM workspaces WHERE id=?", (workspace_id,)).fetchone()
    return serialize_workspace(request, row)


@router.get("/{workspace_id}")
def get_workspace(workspace_id: str, request: Request, user=Depends(get_current_user)):
    return serialize_workspace(request, owned_workspace(request, workspace_id, user["id"]), True)


@router.patch("/{workspace_id}")
def update_workspace(
    workspace_id: str, payload: WorkspaceUpdate, request: Request, user=Depends(get_current_user)
):
    owned_workspace(request, workspace_id, user["id"])
    assignments = []
    values: list[object] = []
    if payload.name is not None:
        assignments.append("name=?")
        values.append(payload.name.strip())
    if payload.favorite is not None:
        assignments.append("favorite=?")
        values.append(int(payload.favorite))
    if not assignments:
        raise HTTPException(status_code=422, detail="没有需要更新的内容")
    assignments.append("updated_at=CURRENT_TIMESTAMP")
    values.extend([workspace_id, user["id"]])
    with request.app.state.db.connect() as connection:
        connection.execute(
            f"UPDATE workspaces SET {', '.join(assignments)} WHERE id=? AND user_id=?",
            values,
        )
        row = connection.execute("SELECT * FROM workspaces WHERE id=?", (workspace_id,)).fetchone()
    return serialize_workspace(request, row)


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(workspace_id: str, request: Request, user=Depends(get_current_user)):
    owned_workspace(request, workspace_id, user["id"])
    request.app.state.assets.delete_workspace_files(user["id"], workspace_id)
    with request.app.state.db.connect() as connection:
        connection.execute(
            "DELETE FROM workspaces WHERE id=? AND user_id=?", (workspace_id, user["id"])
        )
