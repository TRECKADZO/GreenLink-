import os
import asyncio
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
FROM_NAME = os.environ.get("FROM_NAME", "GreenLink")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("[EMAIL] Resend configure avec succes")
else:
    logger.warning("[EMAIL] RESEND_API_KEY absent -> mode MOCK actif")


def is_email_configured():
    return bool(RESEND_API_KEY)


def send_email(to_email, subject, html_body):
    if not to_email:
        logger.warning("[EMAIL] Pas d'adresse email destinataire")
        return False

    if not is_email_configured():
        logger.info(f"[EMAIL-MOCK] Vers: {to_email} | Sujet: {subject}")
        return True

    try:
        params = {
            "from": f"{FROM_NAME} <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body
        }
        email = resend.Emails.send(params)
        logger.info(f"[EMAIL] Envoye a {to_email}: {subject} (id: {email.get('id', 'N/A')})")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Erreur envoi a {to_email}: {e}")
        return False


async def send_email_async(to_email, subject, html_body):
    if not to_email:
        logger.warning("[EMAIL] Pas d'adresse email destinataire")
        return False

    if not is_email_configured():
        logger.info(f"[EMAIL-MOCK] Vers: {to_email} | Sujet: {subject}")
        return True

    try:
        params = {
            "from": f"{FROM_NAME} <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"[EMAIL] Envoye a {to_email}: {subject} (id: {email.get('id', 'N/A')})")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Erreur envoi a {to_email}: {e}")
        return False


HEADER_HTML = """
<div style="background:#059669;padding:24px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink</h1>
  <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Agriculture durable</p>
</div>
"""

FOOTER_HTML = """
<div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">GreenLink - Plateforme d'agriculture durable</p>
</div>
"""


def _wrap_template(body_html):
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      {HEADER_HTML}
      <div style="padding:32px 24px;">
        {body_html}
      </div>
      {FOOTER_HTML}
    </div>
    """


def send_password_reset_email(to_email, user_name, reset_code):
    subject = "GreenLink - Code de reinitialisation"
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Reinitialisation de mot de passe</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Vous avez demande la reinitialisation de votre mot de passe. Voici votre code de verification :
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:24px;margin:16px 0;text-align:center;border:2px dashed #059669;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#059669;">{reset_code}</span>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          Ce code expire dans 15 minutes. Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_quote_approved_email(to_email, user_name, company_name, end_date, admin_note=None):
    subject = "GreenLink - Votre devis a ete approuve"
    body = f"""
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
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://greenlink.ci/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Se connecter
          </a>
        </div>
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_quote_rejected_email(to_email, user_name, company_name, admin_note=None):
    subject = "GreenLink - Votre devis n'a pas ete retenu"
    body = f"""
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
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_account_suspended_email(to_email, user_name, reason=None):
    subject = "GreenLink - Votre compte a ete suspendu"
    body = f"""
        <h2 style="color:#f59e0b;margin:0 0 16px;">Compte suspendu</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Votre compte GreenLink a ete temporairement suspendu.
        </p>
        {f'<div style="background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;"><p style="margin:0;color:#92400e;font-size:14px;">Raison: {reason}</p></div>' if reason else ''}
        <p style="color:#374151;line-height:1.6;">
          Contactez notre equipe support pour plus d'informations.
        </p>
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_account_activated_email(to_email, user_name):
    subject = "GreenLink - Votre compte a ete reactive"
    body = f"""
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
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_welcome_email(to_email, user_name, user_type):
    subject = "GreenLink - Bienvenue sur la plateforme!"
    type_labels = {
        "producteur": "Producteur",
        "acheteur": "Acheteur",
        "entreprise_rse": "Entreprise RSE",
        "fournisseur": "Fournisseur",
        "cooperative": "Cooperative",
        "field_agent": "Agent Terrain",
    }
    label = type_labels.get(user_type, user_type)
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Bienvenue sur GreenLink !</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{user_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Votre compte <strong>{label}</strong> a ete cree avec succes.
          Vous pouvez maintenant acceder a toutes les fonctionnalites de la plateforme.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <p style="margin:0;color:#065f46;font-size:14px;">
            Connectez-vous pour decouvrir votre tableau de bord personnalise.
          </p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://greenlink.ci/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Commencer
          </a>
        </div>
    """
    return send_email(to_email, subject, _wrap_template(body))
