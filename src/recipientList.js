/**
 * recipientList.js
 *
 * Manages multiple named recipient lists for the Karno FM notification service.
 * Data is stored in data/lists.json as:
 *   { activeId: string|null, items: Array<{ id, name, count, createdAt, emails }> }
 *
 * The "active" list is the one used when sending notifications.
 * Backwards-compatible: getListStats() and getRecipientEmails() operate on the active list.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR    = path.join(process.cwd(), 'data');
const LISTS_FILE  = path.join(DATA_DIR, 'lists.json');
const LEGACY_FILE = path.join(DATA_DIR, 'karno-list.json');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isValidEmail(address) {
  return typeof address === 'string' && EMAIL_REGEX.test(address);
}

function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function loadStore() {
  ensureDataDir();
  if (fs.existsSync(LISTS_FILE)) {
    try { return JSON.parse(fs.readFileSync(LISTS_FILE, 'utf8')); }
    catch { return { activeId: null, items: [] }; }
  }
  if (fs.existsSync(LEGACY_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'));
      if (legacy && Array.isArray(legacy.emails) && legacy.emails.length > 0) {
        const id    = randomUUID();
        const store = {
          activeId: id,
          items: [{ id, name: 'Default list', count: legacy.emails.length, createdAt: legacy.updatedAt || new Date().toISOString(), emails: legacy.emails }]
        };
        saveStore(store);
        return store;
      }
    } catch (_err) {}
  }
  return { activeId: null, items: [] };
}

function saveStore(store) {
  ensureDataDir();
  fs.writeFileSync(LISTS_FILE, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
}

function parseAndValidateCsv(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (!lines.length || !lines[0].trim()) throw new Error('The uploaded file is empty.');
  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const emailCol = header.indexOf('email');
  if (emailCol === -1) throw new Error('The CSV must contain a column named "email".');
  let invalidCount = 0;
  let duplicateCount = 0;
  const seen   = new Set();
  const emails = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = splitCsvLine(line);
    const raw = (fields[emailCol] || '').trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (!raw) continue;
    if (!isValidEmail(raw))  { invalidCount++; }
    else if (seen.has(raw))  { duplicateCount++; }
    else                     { seen.add(raw); emails.push(raw); }
  }
  return { validCount: emails.length, invalidCount, duplicateCount, emails };
}

function addList(name, emails) {
  const store = loadStore();
  const id    = randomUUID();
  const entry = { id, name: String(name || 'Untitled list').trim(), count: emails.length, createdAt: new Date().toISOString(), emails };
  store.items.push(entry);
  if (!store.activeId) store.activeId = id;
  saveStore(store);
  const { emails: _e, ...meta } = entry;
  return { ...meta, active: store.activeId === id };
}

function getAllLists() {
  const store = loadStore();
  return store.items.map(({ emails: _e, ...meta }) => ({ ...meta, active: store.activeId === meta.id }));
}

function setActiveList(id) {
  const store = loadStore();
  if (!store.items.find((i) => i.id === id)) return false;
  store.activeId = id;
  saveStore(store);
  return true;
}

function removeList(id) {
  const store = loadStore();
  const idx   = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  store.items.splice(idx, 1);
  if (store.activeId === id) {
    store.activeId = store.items.length > 0 ? store.items[store.items.length - 1].id : null;
  }
  saveStore(store);
  return true;
}

function getRecipientEmails() {
  const store  = loadStore();
  if (!store.activeId) return [];
  const active = store.items.find((i) => i.id === store.activeId);
  return active ? active.emails : [];
}

function getListStats() {
  const store  = loadStore();
  if (!store.activeId) return { exists: false };
  const active = store.items.find((i) => i.id === store.activeId);
  if (!active) return { exists: false };
  return { exists: true, id: active.id, name: active.name, count: active.count, updatedAt: active.createdAt };
}

function deleteList() {
  const store = loadStore();
  if (store.activeId) removeList(store.activeId);
}

function saveList(emails) {
  const store = loadStore();
  if (store.activeId) {
    const idx = store.items.findIndex((i) => i.id === store.activeId);
    if (idx !== -1) {
      store.items[idx].emails    = emails;
      store.items[idx].count     = emails.length;
      store.items[idx].createdAt = new Date().toISOString();
      saveStore(store);
      return;
    }
  }
  addList('Default list', emails);
}

module.exports = { parseAndValidateCsv, addList, getAllLists, setActiveList, removeList, getRecipientEmails, getListStats, deleteList, saveList };
