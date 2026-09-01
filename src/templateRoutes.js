'use strict';

/**
 * templateRoutes.js
 *
 * CRUD endpoints for email templates.
 *
 * GET    /templates           — list all (no bodyHtml)
 * GET    /templates/:id       — single template (with bodyHtml)
 * POST   /templates           — create  { name, subject, bodyHtml }
 * PUT    /templates/:id       — update  { name, subject, bodyHtml }
 * POST   /templates/:id/duplicate — duplicate
 * DELETE /templates/:id       — delete
 */

const express = require('express');
const sanitizeHtml = require('sanitize-html');
const logger = require('./logger');
const {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate
} = require('./templates');

const router = express.Router();

// HTML sanitization options — applied before storing any template body.
// Covers all tags Quill 1.x can produce with the configured toolbar.
const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'a', 'span', 'div', 'blockquote'
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    'a': ['href', 'target', 'rel']
  },
  allowedStyles: {
    '*': {
      'color': [/.*/],
      'text-align': [/^(left|right|center|justify)$/]
    }
  },
  // Force all links to open safely in a new tab.
  transformTags: {
    'a': (tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        href: attribs.href || '#',
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  }
};

function sanitizeBody(html) {
  return sanitizeHtml(html || '', SANITIZE_OPTIONS);
}

function validateFields({ name, subject, bodyHtml }) {
  if (!name || !name.trim()) return '"name" is required.';
  if (!subject || !subject.trim()) return '"subject" is required.';
  if (bodyHtml === undefined || bodyHtml === null) return '"bodyHtml" is required.';
  return null;
}

// GET /templates
router.get('/', (_req, res) => {
  res.json({ status: 'ok', templates: listTemplates() });
});

// GET /templates/:id
router.get('/:id', (req, res) => {
  const t = getTemplate(req.params.id);
  if (!t) return res.status(404).json({ status: 'error', message: 'Template not found.' });
  res.json({ status: 'ok', template: t });
});

// POST /templates
router.post('/', (req, res) => {
  const { name, subject, bodyHtml } = req.body;
  const err = validateFields({ name, subject, bodyHtml });
  if (err) return res.status(400).json({ status: 'error', message: err });

  const template = createTemplate({ name, subject, bodyHtml: sanitizeBody(bodyHtml) });
  logger.info('Template created', { templateId: template.id, name: template.name });
  res.status(201).json({ status: 'ok', template });
});

// PUT /templates/:id
router.put('/:id', (req, res) => {
  const { name, subject, bodyHtml } = req.body;
  const err = validateFields({ name, subject, bodyHtml });
  if (err) return res.status(400).json({ status: 'error', message: err });

  const template = updateTemplate(req.params.id, { name, subject, bodyHtml: sanitizeBody(bodyHtml) });
  if (!template) return res.status(404).json({ status: 'error', message: 'Template not found.' });

  logger.info('Template updated', { templateId: template.id, name: template.name });
  res.json({ status: 'ok', template });
});

// POST /templates/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const template = duplicateTemplate(req.params.id);
  if (!template) return res.status(404).json({ status: 'error', message: 'Template not found.' });

  logger.info('Template duplicated', { newId: template.id, name: template.name });
  res.status(201).json({ status: 'ok', template });
});

// DELETE /templates/:id
router.delete('/:id', (req, res) => {
  const deleted = deleteTemplate(req.params.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Template not found.' });

  logger.info('Template deleted', { templateId: req.params.id });
  res.json({ status: 'ok', message: 'Template deleted.' });
});

module.exports = router;
