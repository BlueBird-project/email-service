const nodemailer = require('nodemailer');
const { config } = require('./config');
const logger = require('./logger');
const { getRecipientEmails, getListStats } = require('./recipientList');
const { getTemplate } = require('./templates');
const { recordSend } = require('./history');

/** Strip HTML tags to produce a plain-text fallback for email clients. */
function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build the email content from a payload.
 * If payload.template_id is set, uses the stored template (subject + HTML body).
 * Otherwise falls back to the auto-generated plain-text format.
 */
function buildEmailContent(payload) {
  if (payload.template_id) {
    const template = getTemplate(payload.template_id);
    if (!template) {
      throw new Error(`Email template not found: ${payload.template_id}`);
    }
    return {
      subject: template.subject,
      html: template.bodyHtml,
      text: stripTags(template.bodyHtml),
      templateId: template.id,
      templateName: template.name
    };
  }

  const subject = `[BlueBird-Karno][${payload.severity.toUpperCase()}] Simulated FM output - ${payload.title}`;

  const lines = [
    'Context: Karno pilot (BlueBird) - Simulated output from the Flexibility Manager.',
    '',
    `Message ID: ${payload.message_id}`,
    `Timestamp (UTC): ${payload.timestamp_utc}`,
    `Severity: ${payload.severity}`,
    `Recommendation type: ${payload.fm_recommendation_type}`,
    `Requested by: ${payload.requested_by}`,
    '',
    `Title: ${payload.title}`,
    `Description: ${payload.description}`,
    '',
    `Validity window: ${payload.valid_from_utc} -> ${payload.valid_to_utc}`,
    `Constraints: ${payload.constraints_summary}`,
    '',
    `Metadata: ${JSON.stringify(payload.metadata || {}, null, 2)}`
  ];

  return {
    subject,
    html: null,
    text: lines.join('\n'),
    templateId: null,
    templateName: null
  };
}

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
}

function buildMailMessage({ from, to, bcc, subject, text, html }) {
  const msg = { from, subject, text };
  if (to) msg.to = to;
  if (bcc) msg.bcc = bcc;
  if (html) msg.html = html;
  return msg;
}

async function sendFmNotification(payload) {
  const content = buildEmailContent(payload);
  const useList = payload.use_karno_list === true;

  let result;
  if (useList) {
    result = await sendToKarnoList(payload, content);
  } else {
    const recipient = payload.test_recipient_email || config.smtp.to;
    result = await sendToSingleRecipient(payload, content, recipient);
  }

  // Record history — with recipient addresses (operator-visible only).
  recordSend({
    messageId: payload.message_id,
    subject: content.subject,
    recipientType: useList ? 'karno_list' : 'individual',
    recipientCount: result.recipientCount || 1,
    severity: payload.severity,
    recommendationType: payload.fm_recommendation_type,
    templateId: content.templateId,
    templateName: content.templateName,
    dryRun: result.dryRun,
    status: result.dryRun ? 'dry_run' : 'sent',
    recipientAddress: !useList ? (payload.test_recipient_email || config.smtp.to) : null,
    recipientEmails: useList ? result.recipientEmails || null : null
  });

  return result;
}

async function sendToSingleRecipient(payload, content, recipient) {
  if (config.emailDryRun) {
    logger.info('EMAIL_DRY_RUN enabled; email not sent', {
      messageId: payload.message_id,
      subject: content.subject,
      recipientSet: Boolean(recipient)
    });

    return {
      sent: false,
      dryRun: true,
      subject: content.subject,
      recipientSet: Boolean(recipient),
      recipientCount: 1
    };
  }

  if (!config.smtpReady) {
    throw new Error(`SMTP is not ready for real delivery: ${config.smtpIssues.join(' ')}`);
  }

  const transporter = createTransporter();

  const result = await transporter.sendMail(
    buildMailMessage({
      from: config.smtp.from,
      to: recipient,
      subject: content.subject,
      text: content.text,
      html: content.html
    })
  );

  logger.info('Email sent to single recipient', {
    messageId: payload.message_id,
    providerMessageId: result.messageId
    // Privacy: recipient address not logged
  });

  return {
    sent: true,
    dryRun: false,
    providerMessageId: result.messageId,
    recipientCount: 1
  };
}

async function sendToKarnoList(payload, content) {
  const stats = getListStats();

  if (!stats.exists || stats.count === 0) {
    throw new Error('Karno recipient list is empty or not uploaded yet.');
  }

  if (config.emailDryRun) {
    logger.info('EMAIL_DRY_RUN enabled; Karno list email not sent', {
      messageId: payload.message_id,
      subject: content.subject,
      recipientCount: stats.count
    });

    return {
      sent: false,
      dryRun: true,
      subject: content.subject,
      recipientCount: stats.count,
      target: 'karno_list'
    };
  }

  if (!config.smtpReady) {
    throw new Error(`SMTP is not ready for real delivery: ${config.smtpIssues.join(' ')}`);
  }

  const emails = getRecipientEmails();
  const transporter = createTransporter();

  // BCC: recipients cannot see each other's addresses.
  const result = await transporter.sendMail(
    buildMailMessage({
      from: config.smtp.from,
      to: config.smtp.from,
      bcc: emails.join(','),
      subject: content.subject,
      text: content.text,
      html: content.html
    })
  );

  logger.info('Email sent to Karno recipient list', {
    messageId: payload.message_id,
    providerMessageId: result.messageId,
    recipientCount: emails.length
  });

  return {
    sent: true,
    dryRun: false,
    providerMessageId: result.messageId,
    recipientCount: emails.length,
    recipientEmails: emails,
    target: 'karno_list'
  };
}

module.exports = { sendFmNotification };

