/**
 * listRoutes.js
 *
 * Express router for Karno recipient list management.
 *
 * Endpoints:
 *   POST   /karno/list         Upload a CSV file to replace the list (auth required)
 *   GET    /karno/list/stats   Get aggregate statistics – no addresses exposed (public)
 *   DELETE /karno/list         Permanently delete the list (auth required)
 *
 * Authentication:
 *   Upload and delete require the header:
 *     X-Api-Key: <value of LIST_API_KEY env variable>
 */

'use strict';

const express = require('express');
const multer = require('multer');
const logger = require('./logger');
const {
  parseAndValidateCsv,
  saveList,
  addList,
  getAllLists,
  setActiveList,
  removeList,
  getListStats,
  getRecipientEmails,
  deleteList
} = require('./recipientList');

const router = express.Router();

// Store uploaded file in memory only – never write CSV to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB max
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  }
});

// ---------------------------------------------------------------------------
// POST /karno/list
// Upload a CSV file to replace the current Karno recipient list.
// ---------------------------------------------------------------------------

router.post(
  '/',
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Send a multipart/form-data request with a field named "file".'
      });
    }

    let result;
    try {
      const csvText = req.file.buffer.toString('utf8');
      result = parseAndValidateCsv(csvText);
    } catch (error) {
      return res.status(422).json({
        status: 'error',
        message: error.message
      });
    }

    if (result.validCount === 0) {
      return res.status(422).json({
        status: 'error',
        message: 'No valid email addresses found in the uploaded file.',
        summary: {
          valid: 0,
          invalid: result.invalidCount,
          duplicates: result.duplicateCount
        }
      });
    }

    saveList(result.emails);

    // Privacy: log counts only, never addresses.
    logger.info('Karno recipient list updated', {
      validCount: result.validCount,
      invalidCount: result.invalidCount,
      duplicateCount: result.duplicateCount
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Karno recipient list updated successfully.',
      summary: {
        valid: result.validCount,
        invalid: result.invalidCount,
        duplicates: result.duplicateCount
      }
    });
  }
);

// ---------------------------------------------------------------------------
// GET /karno/list/stats
// Returns aggregate statistics only.
// ---------------------------------------------------------------------------

router.get('/stats', (req, res) => {
  const stats = getListStats();

  return res.status(200).json({
    status: 'ok',
    list: stats
  });
});

// ---------------------------------------------------------------------------
// GET /karno/list/emails
// Returns the actual email addresses in the list (operator-visible).
// ---------------------------------------------------------------------------

router.get('/emails', (req, res) => {
  const stats = getListStats();

  if (!stats.exists) {
    return res.status(200).json({ status: 'ok', emails: [], count: 0 });
  }

  const emails = getRecipientEmails();
  return res.status(200).json({ status: 'ok', emails, count: emails.length });
});

// ---------------------------------------------------------------------------
// DELETE /karno/list
// Permanently remove the stored Karno recipient list.
// ---------------------------------------------------------------------------

router.delete('/', (req, res) => {
  deleteList();

  logger.info('Karno recipient list deleted.');

  return res.status(200).json({
    status: 'ok',
    message: 'Karno recipient list deleted.'
  });
});

// ---------------------------------------------------------------------------
// GET /karno/lists
// Returns all stored lists (no emails), with active flag.
// ---------------------------------------------------------------------------

router.get('/all', (req, res) => {
  return res.status(200).json({ status: 'ok', lists: getAllLists() });
});

// ---------------------------------------------------------------------------
// POST /karno/lists  (upload a new list without replacing others)
// ---------------------------------------------------------------------------

router.post(
  '/add',
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded. Use field name "file".' });
    }

    let result;
    try {
      result = parseAndValidateCsv(req.file.buffer.toString('utf8'));
    } catch (error) {
      return res.status(422).json({ status: 'error', message: error.message });
    }

    if (result.validCount === 0) {
      return res.status(422).json({
        status: 'error',
        message: 'No valid email addresses found in the uploaded file.',
        summary: { valid: 0, invalid: result.invalidCount, duplicates: result.duplicateCount }
      });
    }

    const name = (req.body && req.body.name && req.body.name.trim())
      || req.file.originalname.replace(/\.csv$/i, '')
      || 'Untitled list';

    const entry = addList(name, result.emails);

    logger.info('New recipient list added', { listId: entry.id, name: entry.name, count: entry.count });

    return res.status(201).json({
      status: 'ok',
      list: entry,
      summary: { valid: result.validCount, invalid: result.invalidCount, duplicates: result.duplicateCount }
    });
  }
);

// ---------------------------------------------------------------------------
// PUT /karno/lists/:id/activate  — set active list
// ---------------------------------------------------------------------------

router.put('/:id/activate', (req, res) => {
  const ok = setActiveList(req.params.id);
  if (!ok) return res.status(404).json({ status: 'error', message: 'List not found.' });

  logger.info('Active recipient list changed', { listId: req.params.id });
  return res.status(200).json({ status: 'ok', message: 'Active list updated.', activeId: req.params.id });
});

// ---------------------------------------------------------------------------
// DELETE /karno/lists/:id  — delete a specific list by id
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const ok = removeList(req.params.id);
  if (!ok) return res.status(404).json({ status: 'error', message: 'List not found.' });

  logger.info('Recipient list deleted', { listId: req.params.id });
  return res.status(200).json({ status: 'ok', message: 'List deleted.' });
});

module.exports = router;
