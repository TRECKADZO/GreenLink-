# Service d'envoi d'emails pour notifications (devis, compte, etc.)
# Utilise SMTP standard - configurer SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD dans .env

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@greenlink.ci")
FROM_NAME = os.environ.get("FROM_NAME", "GreenLink")


def is_email_configured():
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to_email, subject, html_body):
    if not to_email:
        logger.warning("[EMAIL] Pas d'adresse email destinataire")
        return False

    if not is_email_configured():
        logger.info(f"[EMAIL-MOCK] Vers: {to_email} | Sujet: {subject}")
        logger.info("[EMAIL-MOCK] Configurez SMTP_HOST, SMTP_USER, SMTP_PASSWORD dans .env pour activer l'envoi reel")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[EMAIL] Envoye a {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Erreur envoi a {to_email}: {e}")
        return False


# ============= TEMPLATES =============

def send_quote_approved_email(to_email, user_name, company_name, end_date, admin_note=None):
    subject = "GreenLink - Votre devis a ete approuve"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#059669;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Agriculture durable</p>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#059669;margin:0 0 16px;">Devis approuve !</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Nous avons le plaisir de vous informer que votre demande de devis pour 
          <strong>{company_name}</strong> a ete <strong style="color:#059669;">approuvee</strong>.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <p style="margin:0;color:#065f46;font-size:14px;">
            Votre compte est maintenant actif jusqu'au <strong>{end_date}</strong>.
          </p>
        </div>
        {f'<p style="color:#6b7280;font-size:14px;"><em>Note: {admin_note}</em></p>' if admin_note else ''}
        <p style="color:#374151;line-height:1.6;">
          Vous pouvez desormais acceder a toutes les fonctionnalites de votre abonnement.
          Connectez-vous a votre espace pour commencer.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://greenlink.ci/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Se connecter
          </a>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">GreenLink - Plateforme d'agriculture durable</p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html)


def send_quote_rejected_email(to_email, user_name, company_name, admin_note=None):
    subject = "GreenLink - Votre devis n'a pas ete retenu"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#059669;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Agriculture durable</p>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#dc2626;margin:0 0 16px;">Devis non retenu</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Nous vous informons que votre demande de devis pour 
          <strong>{company_name}</strong> n'a pas ete retenue.
        </p>
        {f'<div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #dc2626;"><p style="margin:0;color:#991b1b;font-size:14px;">{admin_note}</p></div>' if admin_note else ''}
        <p style="color:#374151;line-height:1.6;">
          Vous pouvez soumettre un nouveau devis ou nous contacter pour plus d'informations.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">GreenLink - Plateforme d'agriculture durable</p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html)


def send_account_suspended_email(to_email, user_name, reason=None):
    subject = "GreenLink - Votre compte a ete suspendu"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#059669;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#f59e0b;margin:0 0 16px;">Compte suspendu</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Votre compte GreenLink a ete temporairement suspendu.
        </p>
        {f'<div style="background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;"><p style="margin:0;color:#92400e;font-size:14px;">Raison: {reason}</p></div>' if reason else ''}
        <p style="color:#374151;line-height:1.6;">
          Contactez notre equipe support pour plus d'informations.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">GreenLink - Plateforme d'agriculture durable</p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html)


def send_account_activated_email(to_email, user_name):
    subject = "GreenLink - Votre compte a ete reactive"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#059669;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#059669;margin:0 0 16px;">Compte reactive !</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Bonne nouvelle ! Votre compte GreenLink a ete reactive par l'administrateur.
          Vous pouvez vous reconnecter et utiliser toutes les fonctionnalites.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://greenlink.ci/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Se connecter
          </a>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">GreenLink - Plateforme d'agriculture durable</p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html)
