from fastapi.testclient import TestClient


def test_admin_can_update_smtp_settings(client: TestClient):
    client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    updated = client.patch(
        "/api/system/settings",
        json={
            "smtp_host": "smtp.example.com",
            "smtp_port": 587,
            "smtp_username": "mailer",
            "smtp_password": "secret",
            "smtp_sender": "studio@example.com",
            "smtp_tls": True,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["smtp_host"] == "smtp.example.com"
    assert updated.json()["has_smtp_password"] is True
    assert "smtp_password" not in updated.json()


def test_regular_user_cannot_read_system_settings(client: TestClient, register):
    register()
    assert client.get("/api/system/settings").status_code == 403
