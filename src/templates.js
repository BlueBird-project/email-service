'use strict';

/**
 * templates.js
 *
 * Persistent storage for email templates used by the Karno FM notification service.
 * Templates are stored in data/templates.json.
 * bodyHtml is sanitized at write time (in templateRoutes.js) before being saved here.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(process.cwd(), 'data');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadTemplates() {
  ensureDataDir();
  if (!fs.existsSync(TEMPLATES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveTemplates(templates) {
  ensureDataDir();
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
}

/** Returns all templates without bodyHtml (for list views). */
function listTemplates() {
  return loadTemplates().map(({ id, name, subject, createdAt, updatedAt }) => ({
    id,
    name,
    subject,
    createdAt,
    updatedAt
  }));
}

/** Returns a single template including bodyHtml, or null if not found. */
function getTemplate(id) {
  return loadTemplates().find((t) => t.id === id) || null;
}

/** Creates and persists a new template. bodyHtml must already be sanitized. */
function createTemplate({ name, subject, bodyHtml }) {
  const templates = loadTemplates();
  const now = new Date().toISOString();
  const template = {
    id: randomUUID(),
    name: name.trim(),
    subject: subject.trim(),
    bodyHtml,
    createdAt: now,
    updatedAt: now
  };
  templates.push(template);
  saveTemplates(templates);
  return template;
}

/** Updates an existing template. bodyHtml must already be sanitized. Returns null if not found. */
function updateTemplate(id, { name, subject, bodyHtml }) {
  const templates = loadTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  templates[idx] = {
    ...templates[idx],
    name: name.trim(),
    subject: subject.trim(),
    bodyHtml,
    updatedAt: new Date().toISOString()
  };
  saveTemplates(templates);
  return templates[idx];
}

/** Creates a copy of an existing template. Returns null if not found. */
function duplicateTemplate(id) {
  const original = getTemplate(id);
  if (!original) return null;
  return createTemplate({
    name: `${original.name} (copia)`,
    subject: original.subject,
    bodyHtml: original.bodyHtml
  });
}

/** Deletes a template by id. Returns true if deleted, false if not found. */
function deleteTemplate(id) {
  const templates = loadTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  saveTemplates(filtered);
  return true;
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate
};
