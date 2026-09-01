const dotenv = require('dotenv');

dotenv.config();

function toBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return String(value).toLowerCase() === 'true';
}

function getSmtpReadiness(smtp) {
  const issues = [];

  if (!smtp.host || smtp.host.includes('example.com')) {
    issues.push('SMTP host is missing or still set to example value.');
  }

  if (!smtp.user || smtp.user === 'your-user') {
    issues.push('SMTP username is missing or still set to example value.');
  }

  if (!smtp.pass || smtp.pass === 'your-password') {
    issues.push('SMTP password is missing or still set to example value.');
  }

  if (!smtp.from || smtp.from.includes('example.com')) {
    issues.push('SMTP sender address is missing or still set to example value.');
  }

  if (!smtp.to || smtp.to.includes('example.com')) {
    issues.push('Default recipient email is missing or still set to example value.');
  }

  return {
    ready: issues.length === 0,
    issues
  };
}

const config = {
  port: Number(process.env.PORT || 3000),
  appEnv: process.env.APP_ENV || 'development',
  emailDryRun: toBoolean(process.env.EMAIL_DRY_RUN, false),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_TO
  }
};

const smtpReadiness = getSmtpReadiness(config.smtp);
config.smtpReady = smtpReadiness.ready;
config.smtpIssues = smtpReadiness.issues;

module.exports = { config };
