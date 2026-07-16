import io
import hashlib
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel

from .auth import get_current_user


router = APIRouter(prefix="/api/assets", tags=["assets"])


class AssetUpdate(BaseModel):
    favorite: bool


class AssetService:
    def __init__(self, db, storage_path: Path):
        self.db = db
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, relative: str) -> Path:
        path = (self.storage_path / relative).resolve()
        if self.storage_path.resolve() not in path.parents:
            raise ValueError("Invalid storage path")
        return path

    def quota(self, user_id: str) -> tuple[int, int]:
        with self.db.connect() as connection:
            used = connection.execute(
                "SELECT COUNT(*) FROM assets WHERE user_id=? AND kind='generated'", (user_id,)
            ).fetchone()[0]
        return used, 1000

    def save_generated(
        self,
        user_id: str,
        workspace_id: str,
        run_id: str | None,
        content: bytes,
        mime_type: str,
    ) -> dict:
        try:
            with Image.open(io.BytesIO(content)) as image:
                width, height = image.size
                image.verify()
        except Exception as exc:
            raise ValueError("Upstream returned an invalid image") from exc
        extension = {"image/jpeg": ".jpg", "image/webp": ".webp"}.get(mime_type, ".png")
        asset_id = str(uuid.uuid4())
        relative = Path(user_id) / workspace_id / f"{asset_id}{extension}"
        path = self._safe_path(relative.as_posix())
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        with self.db.connect() as connection:
            connection.execute(
                """INSERT INTO assets(id,user_id,workspace_id,run_id,kind,path,mime_type,width,height,size_bytes)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (
                    asset_id,
                    user_id,
                    workspace_id,
                    run_id,
                    "generated",
                    relative.as_posix(),
                    mime_type,
                    width,
                    height,
                    len(content),
                ),
            )
        return self.get(asset_id, user_id)

    def save_reference(self, user_id: str, content: bytes, mime_type: str) -> tuple[dict, bool]:
        digest = hashlib.sha256(content).hexdigest()
        with self.db.connect() as connection:
            existing = connection.execute(
                "SELECT * FROM reference_assets WHERE user_id=? AND sha256=?", (user_id, digest)
            ).fetchone()
        if existing:
            return serialize_reference_asset(existing), True
        try:
            with Image.open(io.BytesIO(content)) as image:
                width, height = image.size
                image.verify()
        except Exception as exc:
            raise ValueError("Reference upload is not a valid image") from exc
        extension = {"image/jpeg": ".jpg", "image/webp": ".webp"}.get(mime_type, ".png")
        asset_id = str(uuid.uuid4())
        relative = Path(user_id) / "references" / f"{asset_id}{extension}"
        path = self._safe_path(relative.as_posix())
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        with self.db.connect() as connection:
            connection.execute(
                """INSERT INTO reference_assets(id,user_id,sha256,path,mime_type,width,height,size_bytes)
                   VALUES(?,?,?,?,?,?,?,?)""",
                (asset_id, user_id, digest, relative.as_posix(), mime_type, width, height, len(content)),
            )
            row = connection.execute("SELECT * FROM reference_assets WHERE id=?", (asset_id,)).fetchone()
        return serialize_reference_asset(row), False

    def get_reference(self, asset_id: str, user_id: str) -> dict | None:
        with self.db.connect() as connection:
            row = connection.execute(
                "SELECT * FROM reference_assets WHERE id=? AND user_id=?", (asset_id, user_id)
            ).fetchone()
        return serialize_reference_asset(row) if row else None

    def list_references(self, user_id: str) -> list[dict]:
        with self.db.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM reference_assets WHERE user_id=? ORDER BY created_at DESC", (user_id,)
            ).fetchall()
        return [serialize_reference_asset(row) for row in rows]

    def delete_reference(self, asset_id: str, user_id: str) -> bool:
        reference = self.get_reference(asset_id, user_id)
        if not reference:
            return False
        self._safe_path(reference["path"]).unlink(missing_ok=True)
        with self.db.connect() as connection:
            connection.execute("DELETE FROM reference_assets WHERE id=? AND user_id=?", (asset_id, user_id))
        return True

    def get(self, asset_id: str, user_id: str) -> dict | None:
        with self.db.connect() as connection:
            row = connection.execute(
                "SELECT * FROM assets WHERE id=? AND user_id=?", (asset_id, user_id)
            ).fetchone()
        return serialize_asset(row) if row else None

    def delete(self, asset_id: str, user_id: str) -> bool:
        asset = self.get(asset_id, user_id)
        if not asset:
            return False
        self._safe_path(asset["path"]).unlink(missing_ok=True)
        with self.db.connect() as connection:
            connection.execute("DELETE FROM assets WHERE id=? AND user_id=?", (asset_id, user_id))
        return True

    def delete_workspace_files(self, user_id: str, workspace_id: str) -> None:
        directory = self._safe_path((Path(user_id) / workspace_id).as_posix())
        if directory.exists():
            shutil.rmtree(directory)


def serialize_asset(row) -> dict:
    return {
        "id": row["id"],
        "workspace_id": row["workspace_id"],
        "run_id": row["run_id"],
        "kind": row["kind"],
        "path": row["path"],
        "mime_type": row["mime_type"],
        "width": row["width"],
        "height": row["height"],
        "size_bytes": row["size_bytes"],
        "favorite": bool(row["favorite"]),
        "created_at": row["created_at"],
        "content_url": f"/api/assets/{row['id']}/content",
        "download_url": f"/api/assets/{row['id']}/download",
    }


def serialize_reference_asset(row) -> dict:
    return {
        "id": row["id"],
        "path": row["path"],
        "mime_type": row["mime_type"],
        "width": row["width"],
        "height": row["height"],
        "size_bytes": row["size_bytes"],
        "created_at": row["created_at"],
        "content_url": f"/api/reference-assets/{row['id']}/content",
    }


def owned_asset(request: Request, asset_id: str, user_id: str):
    asset = request.app.state.assets.get(asset_id, user_id)
    if not asset:
        raise HTTPException(status_code=404, detail="图片不存在")
    return asset


@router.get("/favorites")
def favorite_assets(request: Request, user=Depends(get_current_user)):
    with request.app.state.db.connect() as connection:
        rows = connection.execute(
            """SELECT a.*,r.prompt,r.model,r.params_json
               FROM assets a LEFT JOIN runs r ON r.id=a.run_id
               WHERE a.user_id=? AND a.favorite=1
               ORDER BY a.created_at DESC""",
            (user["id"],),
        ).fetchall()
    result = []
    for row in rows:
        item = serialize_asset(row)
        item.update({"prompt": row["prompt"], "model": row["model"], "params": row["params_json"]})
        result.append(item)
    return result


@router.get("/{asset_id}/content")
def content(asset_id: str, request: Request, user=Depends(get_current_user)):
    asset = owned_asset(request, asset_id, user["id"])
    return FileResponse(request.app.state.assets._safe_path(asset["path"]), media_type=asset["mime_type"], headers={"Cache-Control": "private, max-age=604800, immutable"})


@router.get("/{asset_id}/download")
def download(asset_id: str, request: Request, user=Depends(get_current_user)):
    asset = owned_asset(request, asset_id, user["id"])
    extension = Path(asset["path"]).suffix
    return FileResponse(
        request.app.state.assets._safe_path(asset["path"]),
        media_type=asset["mime_type"],
        filename=f"studio-{asset_id}{extension}",
    )


@router.patch("/{asset_id}")
def update_asset(asset_id: str, payload: AssetUpdate, request: Request, user=Depends(get_current_user)):
    owned_asset(request, asset_id, user["id"])
    with request.app.state.db.connect() as connection:
        connection.execute(
            "UPDATE assets SET favorite=? WHERE id=? AND user_id=?",
            (int(payload.favorite), asset_id, user["id"]),
        )
    return request.app.state.assets.get(asset_id, user["id"])


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, request: Request, user=Depends(get_current_user)):
    if not request.app.state.assets.delete(asset_id, user["id"]):
        raise HTTPException(status_code=404, detail="图片不存在")


reference_router = APIRouter(prefix="/api/reference-assets", tags=["reference assets"])


@reference_router.get("")
def list_reference_assets(request: Request, user=Depends(get_current_user)):
    return request.app.state.assets.list_references(user["id"])


@reference_router.post("", status_code=status.HTTP_201_CREATED)
async def upload_reference_assets(
    request: Request, files: list[UploadFile] = File(...), user=Depends(get_current_user)
):
    stored = []
    for upload in files:
        content = await upload.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="单张参考图不能超过 20MB")
        try:
            asset, reused = request.app.state.assets.save_reference(
                user["id"], content, upload.content_type or "image/png"
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        stored.append({**asset, "reused": reused})
    return stored


@reference_router.get("/{asset_id}/content")
def reference_content(asset_id: str, request: Request, user=Depends(get_current_user)):
    asset = request.app.state.assets.get_reference(asset_id, user["id"])
    if not asset:
        raise HTTPException(status_code=404, detail="参考图不存在")
    return FileResponse(request.app.state.assets._safe_path(asset["path"]), media_type=asset["mime_type"], headers={"Cache-Control": "private, max-age=604800, immutable"})


@reference_router.delete("/{asset_id}", status_code=204)
def delete_reference_asset(asset_id: str, request: Request, user=Depends(get_current_user)):
    if not request.app.state.assets.delete_reference(asset_id, user["id"]):
        raise HTTPException(status_code=404, detail="参考图不存在")
