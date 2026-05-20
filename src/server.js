const express = require('express');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const logger = require('./logger');
const { validateFmOutput } = require('./validation');
const { sendFmNotification } = require('./emailService');

const app = express();
const logsPath = path.join(process.cwd(), 'logs', 'app.log');

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

function getRecentEvents(limit = 10) {
  if (!fs.existsSync(logsPath)) {
    return [];
  }

  const raw = fs.readFileSync(logsPath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const selected = lines.slice(-Math.max(1, limit));

  return selected
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'bluebird-fm-email-poc',
    env: config.appEnv,
    emailDryRun: config.emailDryRun,
    smtpReady: config.smtpReady,
    smtpIssues: config.smtpIssues,
    timestamp: new Date().toISOString()
  });
});

app.get('/events', (req, res) => {
  const parsed = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(parsed) ? 10 : Math.min(Math.max(parsed, 1), 50);

  res.status(200).json({
    status: 'ok',
    events: getRecentEvents(limit)
  });
});

app.post('/fm-output', async (req, res) => {
  const validationResult = validateFmOutput(req.body);

  if (!validationResult.success) {
    logger.warn('Validation error for FM output', {
      issues: validationResult.error.issues
    });

    return res.status(400).json({
      status: 'error',
      message: 'Invalid FM output payload',
      issues: validationResult.error.issues
    });
  }

  const payload = validationResult.data;

  logger.info('FM output received', {
    messageId: payload.message_id,
    recommendationType: payload.fm_recommendation_type,
    severity: payload.severity
  });

  try {
    const emailResult = await sendFmNotification(payload);

    return res.status(202).json({
      status: 'accepted',
      message: 'FM output processed and notification flow executed',
      email: emailResult
    });
  } catch (error) {
    logger.error('Failed to send FM email notification', {
      messageId: payload.message_id,
      error: error.message
    });

    return res.status(502).json({
      status: 'error',
      message: 'FM output received but email notification failed',
      detail: error.message
    });
  }
});

app.use((err, req, res, next) => {
  logger.error('Unhandled server error', {
    error: err.message
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    appEnv: config.appEnv,
    emailDryRun: config.emailDryRun
  });
});
