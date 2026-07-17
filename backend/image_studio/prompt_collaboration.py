import json
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .auth import get_current_user
from .generation import _response_image_data, _responses_text
from .providers import api_endpoint, is_image_model, owned_provider
from .security import decrypt_secret
from .workspaces import owned_workspace


router = APIRouter(prefix="/api/workspaces", tags=["prompt collaboration"])


class CollaborationInput(BaseModel):
    provider_id: str
    model: str
    message: str = Field(min_length=1, max_length=8000)
    style_prompt: str = ""
    settings: dict[str, str] = {}
    reference_asset_ids: list[str] = []
    library_reference_ids: list[str] = []


def _load_references(request: Request, user_id: str, generated_ids: list[str], library_ids: list[str]):
    references = []
    for asset_id in list(dict.fromkeys(generated_ids))[:10]:
        asset = request.app.state.assets.get(asset_id, user_id)
        if not asset:
            raise HTTPException(status_code=404, detail="引用图片不存在")
        references.append((request.app.state.assets._safe_path(asset["path"]).read_bytes(), asset["mime_type"]))
    for asset_id in list(dict.fromkeys(library_ids))[: max(0, 10 - len(references))]:
        asset = request.app.state.assets.get_reference(asset_id, user_id)
        if not asset:
            raise HTTPException(status_code=404, detail="参考图库图片不存在")
        references.append((request.app.state.assets._safe_path(asset["path"]).read_bytes(), asset["mime_type"]))
    return references


def create_collaboration_reply(*, base_url: str, api_key: str, model: str, history: list[dict], style_prompt: str, settings: dict[str, str], references: list[tuple[bytes, str]]):
    transcript = "\n".join(f"{item['role']}: {item['content']}" for item in history[-12:])
    context = ["以下是用户与提示词协作助手的近期对话：", transcript]
    if style_prompt.strip():
        context.append(f"当前风格预设：{style_prompt.strip()}")
    if settings:
        context.append(f"当前图片设置：{json.dumps(settings, ensure_ascii=False)}")
    content = [{"type": "input_text", "text": "\n\n".join(context)}]
    content.extend({"type": "input_image", "image_url": _response_image_data(data, mime)} for data, mime in references)
    payload = {
        "model": model,
        "instructions": (
            "你是严谨的图片提示词协作助手。用户的话描述的是创作意图，不要套用通用模板或擅自添加主体、风格、构图。"
            "请仔细结合参考图、历史对话、风格和技术设置。若意图存在关键歧义，只提出一个具体澄清问题；"
            "若信息足够，直接输出一条可以交给图片模型的完整提示词，不要解释过程。"
        ),
        "input": [{"role": "user", "content": content}],
        "max_output_tokens": 2048,
        "reasoning": {"effort": "low"},
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        with httpx.Client(trust_env=False, timeout=90) as client:
            response = client.post(api_endpoint(base_url, "responses"), headers=headers, json=payload)
        response.raise_for_status()
        return _responses_text(response.json())
    except (httpx.HTTPError, ValueError) as exc:
        raise RuntimeError(f"提示词协作失败：{exc}") from exc


@router.get("/{workspace_id}/prompt-collaboration")
def list_messages(workspace_id: str, request: Request, user=Depends(get_current_user)):
    owned_workspace(request, workspace_id, user["id"])
    with request.app.state.db.connect() as connection:
        rows = connection.execute(
            "SELECT id,role,content,created_at FROM prompt_collaboration_messages WHERE workspace_id=? AND user_id=? ORDER BY rowid",
            (workspace_id, user["id"]),
        ).fetchall()
    return [dict(row) for row in rows]


@router.delete("/{workspace_id}/prompt-collaboration", status_code=204)
def reset_collaboration(workspace_id: str, request: Request, user=Depends(get_current_user)):
    owned_workspace(request, workspace_id, user["id"])
    with request.app.state.db.connect() as connection:
        connection.execute(
            "DELETE FROM prompt_collaboration_messages WHERE workspace_id=? AND user_id=?",
            (workspace_id, user["id"]),
        )
    return Response(status_code=204)


@router.post("/{workspace_id}/prompt-collaboration")
async def collaborate(workspace_id: str, payload: CollaborationInput, request: Request, user=Depends(get_current_user)):
    owned_workspace(request, workspace_id, user["id"])
    provider = owned_provider(request, payload.provider_id, user["id"])
    if is_image_model(payload.model):
        raise HTTPException(status_code=422, detail="提示词协作需要文本模型")
    references = _load_references(request, user["id"], payload.reference_asset_ids, payload.library_reference_ids)
    user_message = {"id": str(uuid.uuid4()), "role": "user", "content": payload.message.strip()}
    with request.app.state.db.connect() as connection:
        connection.execute(
            "INSERT INTO prompt_collaboration_messages(id,user_id,workspace_id,role,content) VALUES(?,?,?,?,?)",
            (user_message["id"], user["id"], workspace_id, "user", user_message["content"]),
        )
        rows = connection.execute(
            "SELECT role,content FROM prompt_collaboration_messages WHERE workspace_id=? AND user_id=? ORDER BY rowid",
            (workspace_id, user["id"]),
        ).fetchall()
    api_key = decrypt_secret(request.app.state.settings.encryption_key, provider["api_key_encrypted"])
    try:
        reply = await run_in_threadpool(
            create_collaboration_reply,
            base_url=provider["base_url"], api_key=api_key, model=payload.model,
            history=[dict(row) for row in rows], style_prompt=payload.style_prompt,
            settings=payload.settings, references=references,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    assistant_message = {"id": str(uuid.uuid4()), "role": "assistant", "content": reply}
    with request.app.state.db.connect() as connection:
        connection.execute(
            "INSERT INTO prompt_collaboration_messages(id,user_id,workspace_id,role,content) VALUES(?,?,?,?,?)",
            (assistant_message["id"], user["id"], workspace_id, "assistant", reply),
        )
    return {"messages": [user_message, assistant_message], "candidate_prompt": reply}
