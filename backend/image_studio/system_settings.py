from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .auth import get_current_user
from .security import encrypt_secret


router = APIRouter(prefix="/api/system/settings", tags=["system"])


class SystemSettingsUpdate(BaseModel):
    smtp_host: str = ""
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str = ""
    smtp_password: str | None = None
    smtp_sender: str = ""
    smtp_tls: bool = True


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


def serialize(row) -> dict:
    if not row:
        return {
            "smtp_host": "", "smtp_port": 587, "smtp_username": "",
            "smtp_sender": "", "smtp_tls": True, "has_smtp_password": False,
        }
    return {
        "smtp_host": row["smtp_host"],
        "smtp_port": row["smtp_port"],
        "smtp_username": row["smtp_username"],
        "smtp_sender": row["smtp_sender"],
        "smtp_tls": bool(row["smtp_tls"]),
        "has_smtp_password": bool(row["smtp_password_encrypted"]),
    }


@router.get("")
def get_settings(request: Request, _user=Depends(require_admin)):
    with request.app.state.db.connect() as connection:
        row = connection.execute("SELECT * FROM system_settings WHERE id=1").fetchone()
    return serialize(row)


@router.patch("")
def update_settings(payload: SystemSettingsUpdate, request: Request, _user=Depends(require_admin)):
    with request.app.state.db.connect() as connection:
        current = connection.execute("SELECT * FROM system_settings WHERE id=1").fetchone()
        encrypted = current["smtp_password_encrypted"] if current else ""
        if payload.smtp_password:
            encrypted = encrypt_secret(request.app.state.settings.encryption_key, payload.smtp_password)
        connection.execute(
            """INSERT INTO system_settings(
                   id,smtp_host,smtp_port,smtp_username,smtp_password_encrypted,smtp_sender,smtp_tls,updated_at
               ) VALUES(1,?,?,?,?,?,?,CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET
                   smtp_host=excluded.smtp_host,smtp_port=excluded.smtp_port,
                   smtp_username=excluded.smtp_username,
                   smtp_password_encrypted=excluded.smtp_password_encrypted,
                   smtp_sender=excluded.smtp_sender,smtp_tls=excluded.smtp_tls,
                   updated_at=CURRENT_TIMESTAMP""",
            (
                payload.smtp_host.strip(), payload.smtp_port, payload.smtp_username.strip(),
                encrypted, payload.smtp_sender.strip(), int(payload.smtp_tls),
            ),
        )
        row = connection.execute("SELECT * FROM system_settings WHERE id=1").fetchone()
    return serialize(row)
