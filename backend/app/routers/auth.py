import random
from datetime import datetime, timedelta

import resend
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..config import settings
from ..database import get_db
from ..models import PasswordResetToken, User, generate_invite_code
from ..schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _unique_invite_code(db: Session) -> str:
    for _ in range(20):
        code = generate_invite_code()
        if not db.query(User).filter(User.invite_code == code).first():
            return code
    raise RuntimeError("Could not generate a unique invite code")


def _send_otp_email(to_email: str, user_name: str, otp: str) -> None:
    if not settings.RESEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Add RESEND_API_KEY to your Render environment variables.",
        )

    resend.api_key = settings.RESEND_API_KEY

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#07091A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091A;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:440px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:26px;font-weight:700;letter-spacing:-0.04em;
            background:linear-gradient(135deg,#3B6CFF,#8B5CF6);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            PocketPal
          </span>
        </td></tr>
        <tr><td style="background:#0D1225;border:1px solid rgba(30,45,78,0.65);
          border-radius:20px;padding:32px;">
          <p style="color:#7A8BAD;font-size:14px;margin:0 0 6px;">Hi {user_name},</p>
          <h2 style="color:#E8EAF0;font-size:18px;font-weight:600;margin:0 0 12px;">
            Your reset code
          </h2>
          <p style="color:#7A8BAD;font-size:14px;margin:0 0 24px;">
            Enter this code in PocketPal to reset your password. It expires in <strong style="color:#E8EAF0;">10 minutes</strong>.
          </p>
          <div style="background:#131929;border:1px solid rgba(59,108,255,0.25);
            border-radius:14px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:42px;font-weight:700;letter-spacing:10px;
              color:#3B6CFF;font-family:monospace;">
              {otp}
            </span>
          </div>
          <p style="color:#4A5568;font-size:12px;text-align:center;margin:0;">
            Didn't request this? Ignore this email — your password stays the same.
          </p>
        </td></tr>
        <tr><td style="padding-top:16px;text-align:center;">
          <p style="color:#3A4560;font-size:12px;margin:0;">© PocketPal · Spend Smart, Save Sharp.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    resend.Emails.send({
        "from": "PocketPal <onboarding@resend.dev>",
        "to": [to_email],
        "subject": f"{otp} is your PocketPal reset code",
        "html": html,
        "text": f"Your PocketPal password reset code is: {otp}\n\nExpires in 10 minutes. If you didn't request this, ignore this email.",
    })


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        invite_code=_unique_invite_code(db),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Password reset (OTP) ──────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Always 200 — don't leak whether the email is registered
    if not user:
        return {"detail": "ok"}

    # Invalidate old unused OTPs
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({"used": True})

    otp = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)
    db.add(PasswordResetToken(user_id=user.id, token=otp, expires_at=expires))
    db.commit()

    _send_otp_email(user.email, user.name, otp)
    return {"detail": "ok"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code.")

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.token == payload.otp,
            PasswordResetToken.used == False,  # noqa: E712
        )
        .first()
    )

    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code.")

    record.user.hashed_password = hash_password(payload.new_password)
    record.used = True
    db.commit()

    return {"detail": "Password updated."}
