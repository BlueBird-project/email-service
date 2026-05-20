const nodemailer = require('nodemailer');
const { config } = require('./config');
const logger = require('./logger');

function buildEmailContent(payload) {
  const subject = `[BlueBird][${payload.severity.toUpperCase()}] Simulated FM output - ${payload.title}`;

  const lines = [
    'Context: BlueBird pilot - Simulated output from the Flexibility Manager.',
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
    text: lines.join('\n')
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

async function sendFmNotification(payload) {
  const content = buildEmailContent(payload);
  const recipient = payload.test_recipient_email || config.smtp.to;

  if (config.emailDryRun) {
    logger.info('EMAIL_DRY_RUN enabled; email not sent', {
      messageId: payload.message_id,
      subject: content.subject,
      to: recipient
    });

    return {
      sent: false,
      dryRun: true,
      subject: content.subject,
      to: recipient
    };
  }

  if (!config.smtpReady) {
    throw new Error(`SMTP is not ready for real delivery: ${config.smtpIssues.join(' ')}`);
  }

  const transporter = createTransporter();

  const result = await transporter.sendMail({
    from: config.smtp.from,
    to: recipient,
    subject: content.subject,
    text: content.text
  });

  logger.info('Email sent', {
    messageId: payload.message_id,
    providerMessageId: result.messageId,
    to: recipient
  });

  return {
    sent: true,
    dryRun: false,
    providerMessageId: result.messageId,
    to: recipient
  };
}

module.exports = {
  sendFmNotification
};
