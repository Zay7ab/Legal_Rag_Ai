"""
Email service — sends OTP codes via SMTP.
Configure in backend/.env:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your@gmail.com
  SMTP_PASS=your-app-password     # Gmail: Settings → 2-Step → App Passwords
  EMAIL_FROM=LegalAI Pakistan <your@gmail.com>
"""

from __future__ import annotations

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _smtp_config() -> tuple[str, int, str, str, str]:
    """Read SMTP config fresh on each call. Module-level capture was racy
    because load_dotenv() runs after the routers import this module."""
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    sender = os.getenv("EMAIL_FROM") or f"legalRag Ai <{user}>"
    return host, port, user, password, sender


def send_otp_email(to_email: str, otp: str, full_name: str = "") -> None:
    """Send a 6-digit OTP to the given email address."""
    smtp_host, smtp_port, smtp_user, smtp_pass, email_from = _smtp_config()
    if not smtp_user or not smtp_pass:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_USER and SMTP_PASS in backend/.env. "
            "For Gmail, use a 16-char App Password from "
            "https://myaccount.google.com/apppasswords (2-Step Verification must be on)."
        )

    name = full_name or to_email.split("@")[0]

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#09090b;color:#e8e0cc;border:1px solid rgba(201,168,76,0.25);border-radius:8px;padding:32px;">
      <h2 style="color:#c9a84c;font-size:22px;margin-bottom:4px;">legalRag Ai</h2>
      <p style="color:#8a8aaa;font-size:13px;margin-top:0;margin-bottom:24px;">Pakistan's Legal AI Assistant</p>
      <p style="font-size:14px;margin-bottom:8px;">Hello <strong>{name}</strong>,</p>
      <p style="font-size:14px;margin-bottom:24px;">Here is your verification code to log in to your account:</p>
      <div style="background:#1c1c24;border:1px solid rgba(201,168,76,0.4);border-radius:6px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#c9a84c;">{otp}</span>
      </div>
      <p style="font-size:12px;color:#8a8aaa;">This code is valid for <strong>10 minutes</strong>. If you did not request this login, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid rgba(201,168,76,0.15);margin:20px 0;"/>
      <p style="font-size:11px;color:#5a5a6e;">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{otp} — legalRag Ai Login Code"
    msg["From"] = email_from
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_bytes())
        logger.info("OTP sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send OTP to %s: %s", to_email, exc)
        raise RuntimeError(f"Could not send verification email: {exc}") from exc
