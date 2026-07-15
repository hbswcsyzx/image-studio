from fastapi.testclient import TestClient


def test_provider_serializes_image_and_text_models(client: TestClient, register):
    register()
    provider = client.post(
        "/api/providers",
        json={"name": "Basil", "base_url": "https://example.com", "api_key": "secret"},
    ).json()
    with client.app.state.db.connect() as connection:
        connection.execute(
            "UPDATE providers SET models_json=? WHERE id=?",
            ('["gpt-image-2", "flux-pro", "seedream-5.0", "gpt-5.5"]', provider["id"]),
        )

    payload = client.get("/api/providers").json()[0]
    assert payload["image_models"] == ["gpt-image-2", "flux-pro", "seedream-5.0"]
    assert payload["text_models"] == ["gpt-5.5"]
