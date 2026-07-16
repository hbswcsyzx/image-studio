import io

from PIL import Image
from starlette.testclient import TestClient


def make_png() -> bytes:
    image = Image.new("RGB", (64, 36), (40, 120, 220))
    output = io.BytesIO()
    image.save(output, "PNG")
    return output.getvalue()


def test_reference_upload_deduplicates_for_the_same_user(client: TestClient, register):
    register("artist", "correct horse battery")
    content = make_png()
    first = client.post("/api/reference-assets", files=[("files", ("reference.png", content, "image/png"))])
    second = client.post("/api/reference-assets", files=[("files", ("copy.png", content, "image/png"))])

    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert first.json()[0]["id"] == second.json()[0]["id"]
    assert second.json()[0]["reused"] is True
    content_response = client.get(first.json()[0]["content_url"])
    assert content_response.headers["cache-control"] == "private, max-age=604800, immutable"


def test_prompt_collaboration_persists_messages(client: TestClient, register, monkeypatch):
    register("artist", "correct horse battery")
    provider = client.post("/api/providers", json={"name": "Text", "base_url": "https://up.example", "api_key": "key"}).json()
    workspace = client.post("/api/workspaces", json={"name": "Collaboration"}).json()
    monkeypatch.setattr("image_studio.prompt_collaboration.create_collaboration_reply", lambda **_kwargs: "A faithful cinematic prompt")

    response = client.post(
        f"/api/workspaces/{workspace['id']}/prompt-collaboration",
        json={"provider_id": provider["id"], "model": "gpt-5.5", "message": "Keep the dress and combine both references"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["candidate_prompt"] == "A faithful cinematic prompt"
    history = client.get(f"/api/workspaces/{workspace['id']}/prompt-collaboration").json()
    assert [(item["role"], item["content"]) for item in history] == [
        ("user", "Keep the dress and combine both references"),
        ("assistant", "A faithful cinematic prompt"),
    ]
