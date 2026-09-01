'use strict';

/**
 * history.js
 *
 * Append-only send history stored in data/history.json.
 * Records aggregate data only — no email addresses are stored here.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const MAX_ENTRIES = 200;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadHistory() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
}

/**
 * Record a send event.
 * recipientAddress: single email for individual sends (string)
 * recipientEmails:  full list for karno_list sends (string[])
 *
 * @param {{ messageId, subject, recipientType, recipientCount, severity,
 *           recommendationType, templateId, templateName, dryRun, status,
 *           recipientAddress?, recipientEmails? }} entry
 */
function recordSend({
  messageId,
  subject,
  recipientType,
  recipientCount,
  severity,
  recommendationType,
  templateId,
  templateName,
  dryRun,
  status,
  recipientAddress,
  recipientEmails
}) {
  const history = loadHistory();
  const entry = {
    id: randomUUID(),
    sentAt: new Date().toISOString(),
    messageId,
    subject,
    recipientType,
    recipientCount,
    severity,
    recommendationType,
    templateId: templateId || null,
    templateName: templateName || null,
    dryRun: Boolean(dryRun),
    status,
    // Addresses stored with operator consent
    recipientAddress: recipientAddress || null,
    recipientEmails: recipientEmails || null
  };
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) {
    history.splice(MAX_ENTRIES);
  }
  saveHistory(history);
  return entry;
}

/**
 * Returns the most recent history entries (no addresses).
 * @param {number} limit
 */
function getHistory(limit = 50) {
  return loadHistory().slice(0, Math.min(limit, MAX_ENTRIES));
}

module.exports = { recordSend, getHistory };
