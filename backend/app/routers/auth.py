import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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


def _send_reset_email(to_email: str, user_name: str, reset_link: str) -> None:
    """Send a password-reset email via SMTP. Raises if SMTP is not configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Contact the app administrator.",
        )

    from_addr = settings.SMTP_FROM or settings.SMTP_USER

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#07091A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091A;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">
        <tr><td style="padding-bottom:28px;text-align:center;">
          <span style="font-size:28px;font-weight:700;letter-spacing:-0.04em;
            background:linear-gradient(135deg,#3B6CFF,#8B5CF6);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            PocketPal
          </span>
        </td></tr>
        <tr><td style="background:#0D1225;border:1px solid rgba(30,45,78,0.65);
          border-radius:24px;padding:36px 32px;">
          <p style="color:#7A8BAD;font-size:14px;margin:0 0 8px;">Hi {user_name},</p>
          <h2 style="color:#E8EAF0;font-size:20px;font-weight:600;margin:0 0 16px;">
            Reset your password
          </h2>
          <p style="color:#7A8BAD;font-size:14px;line-height:1.6;margin:0 0 28px;">
            Someone requested a password reset for your PocketPal account.
            Click the button below to set a new password. This link expires in <strong style="color:#E8EAF0;">1 hour</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="{reset_link}"
                style="display:inline-block;background:linear-gradient(135deg,#3B6CFF,#8B5CF6);
                  color:#fff;text-decoration:none;font-weight:600;font-size:15px;
                  padding:14px 36px;border-radius:14px;letter-spacing:0.01em;">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="color:#4A5568;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center;">
            If you didn't request this, you can safely ignore this email.<br>
            Your password won't change until you click the link above.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="color:#3A4560;font-size:12px;margin:0;">
            © PocketPal · Spend Smart, Save Sharp.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    text = (
        f"Hi {user_name},\n\n"
        f"Reset your PocketPal password here:\n{reset_link}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you didn't request this, ignore this email."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your PocketPal password"
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
        s.ehlo()
        s.starttls()
        s.login(settings.SMTP_USER, settings.SMTP_PASS)
        s.sendmail(from_addr, to_email, msg.as_string())


# ── Existing endpoints ────────────────────────────────────────────────────────

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


# ── Password reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return 200 — don't reveal whether the email exists
    if not user:
        return {"detail": "If that email is registered, a reset link has been sent."}

    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({"used": True})

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    db.add(PasswordResetToken(user_id=user.id, token=token, expires_at=expires))
    db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    _send_reset_email(user.email, user.name, reset_link)

    return {"detail": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == payload.token)
        .first()
    )

    if not record or record.used or record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired or already been used. Please request a new one.",
        )

    record.user.hashed_password = hash_password(payload.new_password)
    record.used = True
    db.commit()

    return {"detail": "Password updated successfully."}
