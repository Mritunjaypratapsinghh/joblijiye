"""Email service using Resend."""
import logging
import resend
from app.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending notifications."""

    def __init__(self):
        self._initialized = False

    def _init(self):
        if not self._initialized:
            settings = get_settings()
            if settings.resend_api_key:
                resend.api_key = settings.resend_api_key
                self._initialized = True

    async def send_password_reset(self, to_email: str, reset_token: str) -> bool:
        """Send password reset email."""
        self._init()
        if not self._initialized:
            logger.warning("Resend not configured, skipping email")
            return False

        reset_url = f"https://joblijiye.com/reset-password?token={reset_token}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">JobLijiye</h1>
            </div>
            <h2>Reset Your Password</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="display: inline-block; padding: 14px 28px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">JobLijiye</p>
        </body>
        </html>
        """
        try:
            resend.Emails.send({
                "from": "JobLijiye <noreply@joblijiye.com>",
                "to": [to_email],
                "subject": "Reset your JobLijiye password",
                "html": html,
            })
            logger.info(f"Password reset email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False

    async def send_job_alert(
        self,
        to_email: str,
        user_name: str,
        jobs: list[dict],
        alert_keywords: list[str],
    ) -> bool:
        """Send job alert email."""
        self._init()
        if not self._initialized:
            logger.warning("Resend not configured, skipping email")
            return False

        jobs_html = "".join([
            f"""
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid #eee;">
                    <h3 style="margin: 0 0 5px 0; color: #111;">{job['title']}</h3>
                    <p style="margin: 0 0 5px 0; color: #6366f1;">{job['company']}</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">{job.get('location', 'Remote')}</p>
                    <a href="{job['apply_url']}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Apply Now</a>
                </td>
            </tr>
            """
            for job in jobs[:10]
        ])

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">JobLijiye</h1>
                <p style="color: #666;">Your Job Alert</p>
            </div>
            
            <p>Hi {user_name or 'there'},</p>
            <p>We found <strong>{len(jobs)} new jobs</strong> matching your alert for: <strong>{', '.join(alert_keywords)}</strong></p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                {jobs_html}
            </table>
            
            <p style="color: #666; font-size: 14px;">
                <a href="https://joblijiye.com/jobs">View all jobs</a> | 
                <a href="https://joblijiye.com/settings">Manage alerts</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                JobLijiye - Find your perfect role
            </p>
        </body>
        </html>
        """

        try:
            resend.Emails.send({
                "from": "JobLijiye <alerts@joblijiye.com>",
                "to": [to_email],
                "subject": f"🔔 {len(jobs)} new jobs matching '{alert_keywords[0] if alert_keywords else 'your search'}'",
                "html": html,
            })
            logger.info(f"Job alert sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False


email_service = EmailService()
