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
          <a href="https://greenlink-agritech.com/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
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
          <a href="https://greenlink-agritech.com/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
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
          <a href="https://greenlink-agritech.com/login" style="background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Commencer
          </a>
        </div>
    """
    return send_email(to_email, subject, _wrap_template(body))


def send_new_member_activated_email(to_coop_email, coop_name, member_name, member_phone, village=None):
    subject = f"GreenLink - Nouveau membre active: {member_name}"
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Nouveau membre active</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{coop_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Un nouveau membre vient d'activer son compte sur GreenLink.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Nom:</td><td style="color:#065f46;padding:4px 8px;">{member_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Telephone:</td><td style="color:#065f46;padding:4px 8px;">{member_phone}</td></tr>
            {f'<tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Village:</td><td style="color:#065f46;padding:4px 8px;">{village}</td></tr>' if village else ''}
          </table>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          Ce membre peut maintenant declarer des parcelles et enregistrer des recoltes.
        </p>
    """
    return send_email(to_coop_email, subject, _wrap_template(body))


def send_harvest_notification_email(to_coop_email, coop_name, farmer_name, quantity_kg, crop_type="cacao", carbon_premium=0, original_quantity=None, unit=None):
    # Build display string
    if unit and unit != "kg" and original_quantity:
        unit_label = "tonne(s)" if unit == "tonnes" else "sac(s)" if unit == "sacs" else unit
        quantity_str = f"{int(original_quantity)} {unit_label} ({int(quantity_kg)} kg)"
    else:
        quantity_str = f"{int(quantity_kg)} kg"
    
    subject = f"GreenLink - Nouvelle recolte: {farmer_name} ({quantity_str})"
    premium_html = ""
    if carbon_premium > 0:
        premium_html = f"""
        <div style="background:#fef3c7;border-radius:8px;padding:12px;margin:8px 0;border-left:4px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:14px;">Prime carbone: <strong>{carbon_premium:,.0f} XOF</strong></p>
        </div>"""
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Nouvelle recolte enregistree</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{coop_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Une nouvelle recolte a ete declaree par un membre de votre cooperative.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Producteur:</td><td style="color:#065f46;padding:4px 8px;">{farmer_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Quantite:</td><td style="color:#065f46;padding:4px 8px;">{quantity_str} de {crop_type}</td></tr>
          </table>
        </div>
        {premium_html}
    """
    return send_email(to_coop_email, subject, _wrap_template(body))


def send_ssrte_visit_notification_email(to_coop_email, coop_name, agent_name, farmer_name, risk_level, children_working=0):
    subject = f"GreenLink - Visite SSRTE: {farmer_name} (risque {risk_level})"
    risk_colors = {"faible": "#059669", "moyen": "#f59e0b", "eleve": "#dc2626", "critique": "#7f1d1d"}
    risk_color = risk_colors.get(risk_level, "#6b7280")
    alert_html = ""
    if risk_level in ["eleve", "critique"] or children_working > 0:
        alert_html = f"""
        <div style="background:#fef2f2;border-radius:8px;padding:12px;margin:8px 0;border-left:4px solid #dc2626;">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:bold;">ALERTE: {children_working} enfant(s) observe(s) en situation de travail</p>
        </div>"""
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Visite SSRTE effectuee</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{coop_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Un agent terrain a effectue une visite SSRTE chez un producteur.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Agent:</td><td style="color:#065f46;padding:4px 8px;">{agent_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Producteur:</td><td style="color:#065f46;padding:4px 8px;">{farmer_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Risque:</td><td style="padding:4px 8px;"><span style="color:{risk_color};font-weight:bold;text-transform:uppercase;">{risk_level}</span></td></tr>
          </table>
        </div>
        {alert_html}
    """
    return send_email(to_coop_email, subject, _wrap_template(body))


def send_farmer_assigned_notification_email(to_agent_email, agent_name, farmer_names, assigned_by="Administrateur"):
    count = len(farmer_names) if isinstance(farmer_names, list) else 1
    names_list = ", ".join(farmer_names[:5]) if isinstance(farmer_names, list) else farmer_names
    if isinstance(farmer_names, list) and len(farmer_names) > 5:
        names_list += f" (+{len(farmer_names) - 5} autres)"
    subject = f"GreenLink - {count} agriculteur(s) assigne(s)"
    body = f"""
        <h2 style="color:#059669;margin:0 0 16px;">Nouveaux agriculteurs assignes</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{agent_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          <strong>{assigned_by}</strong> vous a assigne <strong>{count} agriculteur(s)</strong> :
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <p style="margin:0;color:#065f46;font-size:14px;">{names_list}</p>
        </div>
        <p style="color:#374151;line-height:1.6;">
          Vous pouvez maintenant effectuer des visites SSRTE et declarer des parcelles pour ces agriculteurs.
        </p>
    """
    return send_email(to_agent_email, subject, _wrap_template(body))


def send_parcel_verified_notification_email(to_farmer_email, farmer_name, parcel_location, status, carbon_score=None, notes=None):
    status_labels = {"verified": "verifiee", "rejected": "rejetee", "needs_correction": "a corriger"}
    status_colors = {"verified": "#059669", "rejected": "#dc2626", "needs_correction": "#f59e0b"}
    label = status_labels.get(status, status)
    color = status_colors.get(status, "#6b7280")
    subject = f"GreenLink - Parcelle {label}"
    score_html = ""
    if carbon_score and status == "verified":
        score_html = f"""
        <div style="background:#f0fdf4;border-radius:8px;padding:12px;margin:8px 0;border-left:4px solid #059669;">
          <p style="margin:0;color:#065f46;font-size:14px;">Score carbone: <strong>{carbon_score}/10</strong></p>
        </div>"""
    notes_html = f'<p style="color:#6b7280;font-size:14px;"><em>Remarque: {notes}</em></p>' if notes else ""
    body = f"""
        <h2 style="color:{color};margin:0 0 16px;">Parcelle {label}</h2>
        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{farmer_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Votre parcelle a <strong>{parcel_location or 'localisation non precisee'}</strong> a ete
          <strong style="color:{color};">{label}</strong> par un agent terrain.
        </p>
        {score_html}
        {notes_html}
    """
    return send_email(to_farmer_email, subject, _wrap_template(body))


def send_ssrte_critical_alert_email(to_email, coop_name, agent_name, farmer_name, risk_level, children_working=0, dangerous_tasks=None, children_details=None, conditions_vie=None, observations=None):
    """Alerte urgente SSRTE pour visites classees critique ou elevee."""
    is_critique = risk_level == "critique"
    severity_label = "CRITIQUE" if is_critique else "ELEVEE"
    severity_color = "#7f1d1d" if is_critique else "#dc2626"
    bg_color = "#450a0a" if is_critique else "#7f1d1d"

    subject = f"ALERTE URGENTE SSRTE - Risque {severity_label}: {farmer_name}"

    # Dangerous tasks section
    tasks_html = ""
    if dangerous_tasks and len(dangerous_tasks) > 0:
        task_codes = {
            "TD1": "Defrichage/abattage d'arbres",
            "TD2": "Brulis",
            "TD3": "Application de pesticides/herbicides",
            "TD4": "Transport de charges lourdes",
            "TD5": "Utilisation de machette/outils tranchants",
            "TD6": "Travail en hauteur",
            "TD7": "Travail de nuit",
            "TD8": "Exposition produits chimiques",
            "TD9": "Travaux penibles prolonges",
        }
        tasks_list = "".join([f"<li style='color:#991b1b;padding:2px 0;'>{task_codes.get(t, t)}</li>" for t in dangerous_tasks])
        tasks_html = f"""
        <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin:12px 0;border-left:4px solid #dc2626;">
          <p style="margin:0 0 6px;color:#991b1b;font-weight:bold;font-size:13px;">Taches dangereuses observees:</p>
          <ul style="margin:0;padding-left:20px;font-size:13px;">{tasks_list}</ul>
        </div>"""

    # Children details section
    children_html = ""
    if children_details and len(children_details) > 0:
        rows = ""
        for child in children_details:
            scol = "Oui" if child.get("scolarise") else "Non"
            trav = "OUI" if child.get("travaille_exploitation") else "Non"
            trav_style = "color:#dc2626;font-weight:bold;" if child.get("travaille_exploitation") else "color:#065f46;"
            rows += f"""<tr>
              <td style="padding:4px 8px;border-bottom:1px solid #fecaca;">{child.get('prenom', '-')}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #fecaca;text-align:center;">{child.get('age', '-')}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #fecaca;text-align:center;">{child.get('sexe', '-')}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #fecaca;text-align:center;">{scol}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #fecaca;text-align:center;{trav_style}">{trav}</td>
            </tr>"""
        children_html = f"""
        <div style="margin:12px 0;">
          <p style="margin:0 0 6px;color:#991b1b;font-weight:bold;font-size:13px;">Detail des enfants du menage:</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:4px;overflow:hidden;">
            <tr style="background:#fecaca;">
              <th style="padding:6px 8px;text-align:left;color:#7f1d1d;">Prenom</th>
              <th style="padding:6px 8px;text-align:center;color:#7f1d1d;">Age</th>
              <th style="padding:6px 8px;text-align:center;color:#7f1d1d;">Sexe</th>
              <th style="padding:6px 8px;text-align:center;color:#7f1d1d;">Ecole</th>
              <th style="padding:6px 8px;text-align:center;color:#7f1d1d;">Travail</th>
            </tr>
            {rows}
          </table>
        </div>"""

    # Conditions de vie
    conditions_html = ""
    if conditions_vie:
        conditions_html = f"""
        <div style="background:#fef3c7;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:12px;color:#92400e;">
          Conditions de vie: <strong>{conditions_vie}</strong>
        </div>"""

    # Observations
    obs_html = ""
    if observations:
        obs_html = f"""
        <div style="background:#f8fafc;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:12px;color:#475569;">
          <strong>Observations:</strong> {observations}
        </div>"""

    body = f"""
        <div style="background:{bg_color};border-radius:8px;padding:16px;margin:0 0 16px;text-align:center;">
          <p style="color:#fecaca;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:2px;">Alerte Travail des Enfants</p>
          <h2 style="color:#fff;margin:0;font-size:22px;">SITUATION {severity_label}</h2>
          <p style="color:#fca5a5;font-size:14px;margin:8px 0 0;">{children_working} enfant(s) en situation de travail</p>
        </div>

        <p style="color:#374151;line-height:1.6;">Bonjour <strong>{coop_name}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">
          Une visite SSRTE vient d'etre classee <strong style="color:{severity_color};">{severity_label}</strong>.
          Une action immediate est requise pour garantir la protection des enfants.
        </p>

        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;width:120px;">Agent:</td><td style="color:#065f46;padding:4px 8px;">{agent_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Producteur:</td><td style="color:#065f46;padding:4px 8px;">{farmer_name}</td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Risque:</td><td style="padding:4px 8px;"><span style="color:{severity_color};font-weight:bold;text-transform:uppercase;background:#fef2f2;padding:2px 8px;border-radius:4px;">{severity_label}</span></td></tr>
            <tr><td style="color:#065f46;padding:4px 8px;font-weight:bold;">Enfants:</td><td style="color:#dc2626;padding:4px 8px;font-weight:bold;">{children_working} en situation de travail</td></tr>
          </table>
        </div>

        {tasks_html}
        {children_html}
        {conditions_html}
        {obs_html}

        <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border:2px solid #dc2626;">
          <p style="margin:0;color:#991b1b;font-weight:bold;font-size:14px;">Actions recommandees:</p>
          <ol style="color:#991b1b;font-size:13px;padding-left:20px;margin:8px 0 0;">
            <li>Planifier une visite de suivi dans les 48h</li>
            <li>Evaluer les mesures de remediation necessaires</li>
            <li>Contacter la famille pour sensibilisation</li>
            <li>Documenter le plan d'action dans le systeme</li>
          </ol>
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="https://greenlink-agritech.com/login" style="background:#dc2626;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Acceder au tableau de bord
          </a>
        </div>

        <p style="color:#6b7280;font-size:11px;text-align:center;">
          Cet email est genere automatiquement par le systeme SSRTE de GreenLink.
          Ne pas repondre a cet email.
        </p>
    """

    alert_header = f"""
    <div style="background:#dc2626;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">GreenLink - ALERTE SSRTE</h1>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Systeme de Suivi et Remediation du Travail des Enfants</p>
    </div>
    """

    alert_footer = f"""
    <div style="background:#fef2f2;padding:16px 24px;text-align:center;border-top:1px solid #fecaca;">
      <p style="color:#991b1b;font-size:12px;margin:0;font-weight:bold;">GreenLink - Protection de l'enfance dans l'agriculture</p>
    </div>
    """

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:2px solid #dc2626;">
      {alert_header}
      <div style="padding:32px 24px;">
        {body}
      </div>
      {alert_footer}
    </div>
    """

    return send_email(to_email, subject, html)
