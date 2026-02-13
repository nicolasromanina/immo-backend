import nodemailer from 'nodemailer';

export interface EmailData {
  to: string;
  subject: string;
  template?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

// Email templates
const TEMPLATES: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  'kyc-submitted': (data) => ({
    subject: 'Documents KYC soumis',
    html: `<h2>Vos documents ont été soumis</h2><p>Bonjour ${data.name || ''},</p><p>Vos documents KYC ont bien été reçus et sont en cours de vérification.</p><p>— L'équipe de la plateforme</p>`,
  }),
  'kyc-verified': (data) => ({
    subject: 'KYC vérifié avec succès',
    html: `<h2>Vérification KYC réussie</h2><p>Bonjour ${data.name || ''},</p><p>Vos documents ont été vérifiés avec succès. Votre compte est maintenant pleinement opérationnel.</p><p>— L'équipe de la plateforme</p>`,
  }),
  'kyc-rejected': (data) => ({
    subject: 'Documents KYC rejetés',
    html: `<h2>Documents rejetés</h2><p>Bonjour ${data.name || ''},</p><p>Vos documents KYC ont été rejetés.</p><p><strong>Raison :</strong> ${data.reason || 'Non spécifiée'}</p><p>Veuillez resoumettre vos documents.</p><p>— L'équipe de la plateforme</p>`,
  }),
  'new-lead': (data) => ({
    subject: `Nouveau lead ${data.score || ''} - ${data.projectTitle || ''}`,
    html: `<h2>Nouveau lead reçu</h2><p>Un nouveau lead de score <strong>${data.score || 'N/A'}</strong> est intéressé par "${data.projectTitle || ''}".</p><p><strong>Contact :</strong> ${data.leadName || ''}</p><p><strong>Budget :</strong> ${data.budget || 'Non précisé'}</p><p>Connectez-vous pour répondre rapidement.</p>`,
  }),
  'lead-reminder': (data) => ({
    subject: 'Rappel : Lead en attente de réponse',
    html: `<h2>Lead en attente</h2><p>Le lead <strong>${data.leadName || ''}</strong> pour "${data.projectTitle || ''}" attend votre réponse depuis ${data.hoursSince || '?'}h.</p><p>Un temps de réponse rapide améliore votre score de confiance.</p>`,
  }),
  'alert-notification': (data) => ({
    subject: `Alerte : ${data.title || 'Nouvelle alerte'}`,
    html: `<h2>${data.title || 'Alerte'}</h2><p>${data.message || ''}</p>${data.actionUrl ? `<p><a href="${data.actionUrl}">Voir les détails</a></p>` : ''}`,
  }),
  'gdpr-request': (data) => ({
    subject: `Demande RGPD reçue - ${data.type || ''}`,
    html: `<h2>Demande RGPD</h2><p>Type : <strong>${data.type || ''}</strong></p><p>Utilisateur : ${data.userEmail || ''}</p><p>Date limite : ${data.deadline || ''}</p>`,
  }),
  'gdpr-completed': (data) => ({
    subject: 'Votre demande RGPD a été traitée',
    html: `<h2>Demande RGPD traitée</h2><p>Votre demande de type <strong>${data.type || ''}</strong> a été traitée avec succès.</p>${data.notes ? `<p>Notes : ${data.notes}</p>` : ''}`,
  }),
  'invoice-created': (data) => ({
    subject: `Nouvelle facture ${data.invoiceNumber || ''}`,
    html: `<h2>Nouvelle facture</h2><p>Bonjour ${data.name || ''},</p><p>Facture <strong>${data.invoiceNumber || ''}</strong> — Montant : ${data.total || '0'} ${data.currency || 'XOF'} — Échéance : ${data.dueDate || ''}</p>`,
  }),
  'invoice-reminder': (data) => ({
    subject: `Rappel de paiement - ${data.invoiceNumber || ''}`,
    html: `<h2>Rappel de paiement</h2><p>${data.message || `Votre facture ${data.invoiceNumber || ''} est en attente de paiement.`}</p>`,
  }),
  'appointment-reminder': (data) => ({
    subject: `Rappel RDV - ${data.date || ''}`,
    html: `<h2>Rappel de rendez-vous</h2><p>Date : ${data.date || ''}</p><p>Type : ${data.type || ''}</p><p>Projet : ${data.projectTitle || ''}</p>`,
  }),
  'warning': (data) => ({
    subject: 'Action de modération sur votre compte',
    html: `<h2>Action de modération</h2><p><strong>Action :</strong> ${data.action || ''}</p><p><strong>Raison :</strong> ${data.reason || ''}</p><p>Vous pouvez soumettre un appel depuis votre tableau de bord.</p>`,
  }),
  'badge-earned': (data) => ({
    subject: `Badge "${data.badgeName || ''}" obtenu !`,
    html: `<h2>Félicitations !</h2><p>Vous avez obtenu le badge <strong>"${data.badgeName || ''}"</strong>.</p><p>${data.description || ''}</p>`,
  }),
  'contract-expiring': (data) => ({
    subject: `Contrat ${data.contractNumber || ''} expire bientôt`,
    html: `<h2>Contrat expire bientôt</h2><p>Votre contrat <strong>${data.contractNumber || ''}</strong> expire dans <strong>${data.daysLeft || '?'}</strong> jours.</p>`,
  }),
  'support-ticket-created': (data) => ({
    subject: `Ticket support #${data.ticketNumber || ''} créé`,
    html: `<h2>Ticket support créé</h2><p>Numéro : #${data.ticketNumber || ''}</p><p>Sujet : ${data.subject || ''}</p><p>Notre équipe vous répondra rapidement.</p>`,
  }),
  'support-ticket-reply': (data) => ({
    subject: `Réponse à votre ticket #${data.ticketNumber || ''}`,
    html: `<h2>Nouvelle réponse</h2><p>Une réponse a été ajoutée à votre ticket #${data.ticketNumber || ''}. Connectez-vous pour la consulter.</p>`,
  }),
  'crisis-alert': (data) => ({
    subject: `[URGENT] Alerte de crise - ${data.title || ''}`,
    html: `<h2 style="color:red;">Alerte de crise</h2><p>Titre : ${data.title || ''}</p><p>Sévérité : ${data.severity || ''}</p><p>${data.description || ''}</p><p>Action immédiate requise.</p>`,
  }),
  'team-invitation': (data) => ({
    subject: `Invitation à rejoindre l'équipe ${data.promoteurName || ''}`,
    html: `
      <h2>Invitation à rejoindre l'équipe ${data.promoteurName || ''}</h2>
      <p>Bonjour,</p>
      <p>${data.inviterName || 'Un membre de votre organisation'} vous invite à rejoindre l'équipe <strong>${data.promoteurName || ''}</strong> en tant que <strong>${data.role || ''}</strong>.</p>
      <p>Pour accepter l'invitation, cliquez sur le bouton ci-dessous :</p>
      <p><a href="${data.acceptUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Accepter l'invitation</a></p>
      <p>Ce lien expirera le <strong>${data.expiresAt ? new Date(data.expiresAt).toLocaleString('fr-FR') : ''}</strong>.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      <p>— L'équipe de la plateforme</p>
    `,
  }),
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export const sendEmail = async (emailData: EmailData): Promise<void> => {
  const fromAddress = process.env.EMAIL_FROM || 'noreply@plateforme.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Plateforme Immobilière';

  let subject = emailData.subject;
  let html = emailData.html || '';
  let text = emailData.text || '';

  if (emailData.template && TEMPLATES[emailData.template]) {
    const rendered = TEMPLATES[emailData.template](emailData.data || {});
    subject = rendered.subject;
    html = wrapInLayout(rendered.html);
  } else if (html) {
    html = wrapInLayout(html);
  }

  const mailer = getTransporter();

  if (!mailer) {
    console.log('[Email] SMTP not configured, logging email:', {
      to: emailData.to,
      subject,
      template: emailData.template,
    });
    return;
  }

  try {
    await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: emailData.to,
      subject,
      html: html || undefined,
      text: text || undefined,
      attachments: emailData.attachments,
    });
    console.log(`[Email] Sent to ${emailData.to}: ${subject}`);
  } catch (error) {
    console.error(`[Email] Failed to send to ${emailData.to}:`, error);
    throw error;
  }
};

export const sendTemplateEmail = async (
  to: string,
  templateName: string,
  data: Record<string, any>
): Promise<void> => {
  return sendEmail({ to, subject: '', template: templateName, data });
};

export const sendBulkEmails = async (
  recipients: string[],
  emailData: Omit<EmailData, 'to'>
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      await sendEmail({ ...emailData, to });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
};

function wrapInLayout(bodyHtml: string): string {
  const platformName = process.env.PLATFORM_NAME || 'Plateforme Immobilière';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',Tahoma,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.1)}.header{background:#1a1a2e;color:#fff;padding:20px 30px}.header h1{margin:0;font-size:20px}.content{padding:30px}.footer{background:#f8f9fa;padding:20px 30px;font-size:12px;color:#666;text-align:center}a{color:#4361ee}h2{color:#1a1a2e}</style></head><body><div class="container"><div class="header"><h1>${platformName}</h1></div><div class="content">${bodyHtml}</div><div class="footer"><p>&copy; ${new Date().getFullYear()} ${platformName}. Tous droits réservés.</p></div></div></body></html>`;
}