// =============================================================================
// DOM references — all IDs match index.html exactly
// =============================================================================

// Sidebar nav
const sidebarToggle   = document.getElementById('sidebar-toggle');
const sidebar         = document.getElementById('sidebar');
const navButtons      = document.querySelectorAll('.nav-item[data-section]');

// Health / status (Overview)
const healthPill      = document.getElementById('health-pill');
const envValue        = document.getElementById('env-value');
const dryValue        = document.getElementById('dry-value');
const smtpValue       = document.getElementById('smtp-value');
const smtpHint        = document.getElementById('smtp-hint');
const healthTime      = document.getElementById('health-time');
const checkHealthButton = document.getElementById('check-health');

// Overview stat cells
const ovSmtp          = document.getElementById('ov-smtp');
const ovMode          = document.getElementById('ov-mode');
const ovRecipientCount = document.getElementById('ov-recipient-count');
const ovTemplateCount = document.getElementById('ov-template-count');
const ovHistoryList   = document.getElementById('ov-history-list');
const ovSendBtn       = document.getElementById('ov-send-btn');

// Events timeline
const refreshEventsButton = document.getElementById('refresh-events');
const eventList       = document.getElementById('event-list');

// FM form (simplified — only template + recipient fields visible)
const templateSelectEl = document.getElementById('template-select');
const templateSelectHint = document.getElementById('template-select-hint');
const sendTemplateNone = document.getElementById('send-template-none');
const sendTemplateInfo = document.getElementById('send-template-info');
const sendTplNameDisplay = document.getElementById('send-tpl-name-display');
const sendTplSubjectDisplay = document.getElementById('send-tpl-subject-display');
const sendPreviewBox = document.getElementById('send-preview-box');
const sendNotificationBtn = document.getElementById('send-notification-btn');
const sendResultEl = document.getElementById('send-result');
const recipientListPreview = document.getElementById('recipient-list-preview');
const recipientListAddresses = document.getElementById('recipient-list-addresses');
// Hidden FM form (kept for DOM-less payload building — no form element in HTML anymore)
// We no longer need refs to removed fields; defaults are set in buildPayload()

// Recipient list
const listExistsEl    = document.getElementById('list-exists');
const listCountEl     = document.getElementById('list-count');
const listUpdatedEl   = document.getElementById('list-updated');
const listResultEl    = document.getElementById('list-result');
const listFileInput   = document.getElementById('list-file');
const refreshListStatsButton = document.getElementById('refresh-list-stats');
const uploadListButton = document.getElementById('upload-list');
const deleteListButton = document.getElementById('delete-list');

// Templates section
const newTemplateBtnEl     = document.getElementById('new-template-btn');
const templateListEl       = document.getElementById('template-list');
const templateEditorEmptyEl = document.getElementById('template-editor-empty');
const templateEditorFormEl = document.getElementById('template-editor-form');
const tplNameEl            = document.getElementById('tpl-name');
const tplSubjectEl         = document.getElementById('tpl-subject');
const templateResultEl     = document.getElementById('template-result');
const saveTemplateBtnEl    = document.getElementById('save-template-btn');
const deleteTemplateBtnEl  = document.getElementById('delete-template-btn');
const duplicateTemplateBtnEl = document.getElementById('duplicate-template-btn');
const previewTemplateBtnEl = document.getElementById('preview-template-btn');

// Preview modal
const previewModal    = document.getElementById('preview-modal');
const previewSubjectEl = document.getElementById('preview-subject');
const previewBodyEl   = document.getElementById('preview-body');
const closePreviewBtnEl = document.getElementById('close-preview-btn');

// History
const historyEmptyEl  = document.getElementById('history-empty');
const historyTableEl  = document.getElementById('history-table');
const historyTbodyEl  = document.getElementById('history-tbody');
const refreshHistoryBtnEl = document.getElementById('refresh-history-btn');
const filterBtns      = document.querySelectorAll('.filter-btn');

// =============================================================================
// State
// =============================================================================

let currentTemplateId = null;
let quill             = null;
let allHistory        = [];       // full history cache for client-side filtering
let activeFilter      = 'all';

// =============================================================================
// Utility
// =============================================================================

function toDatetimeLocal(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function fromDatetimeLocalToUtc(value) {
  if (!value) return null;
  return new Date(`${value}:00Z`).toISOString();
}

function setDefaultTimes() {
  const now  = new Date();
  const from = new Date(now.getTime() + 30 * 60 * 1000);
  const to   = new Date(from.getTime() + 2 * 60 * 60 * 1000);
  document.getElementById('from').value = toDatetimeLocal(from);
  document.getElementById('to').value   = toDatetimeLocal(to);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// =============================================================================
// Section navigation
// =============================================================================

const SECTIONS = ['overview', 'send', 'recipients', 'templates', 'history'];

function showSection(name) {
  SECTIONS.forEach((s) => {
    const el  = document.getElementById(`section-${s}`);
    const btn = document.getElementById(`nav-${s}`);
    if (el)  el.style.display  = s === name ? '' : 'none';
    if (btn) btn.classList.toggle('active', s === name);
  });

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

sidebarToggle.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  sidebarToggle.setAttribute('aria-expanded', String(open));
});

// Overview CTA goes to Send section
ovSendBtn.addEventListener('click', () => showSection('send'));

// =============================================================================
// Health check
// =============================================================================

async function checkHealth() {
  try {
    const response = await fetch('/health');
    const data     = await response.json();

    const isOk = data.status === 'ok';
    healthPill.textContent = isOk ? 'Operational' : 'Unavailable';
    healthPill.className   = 'pill ' + (isOk ? 'ok' : 'error');

    envValue.textContent   = data.env || '-';
    dryValue.textContent   = data.emailDryRun ? 'Dry run' : 'Real SMTP';
    smtpValue.textContent  = data.smtpReady   ? 'Ready'   : 'Not ready';
    healthTime.textContent = new Date(data.timestamp).toLocaleString();

    // Overview stat
    if (ovSmtp)  ovSmtp.textContent = data.smtpReady ? 'Ready' : 'Not ready';
    if (ovMode)  ovMode.textContent = data.emailDryRun ? 'Dry run' : 'Real SMTP';

    smtpHint.classList.remove('ok', 'error');
    if (data.smtpReady) {
      smtpHint.classList.add('ok');
      smtpHint.textContent = 'SMTP is configured and ready for real delivery.';
    } else {
      smtpHint.classList.add('error');
      const issue = Array.isArray(data.smtpIssues) && data.smtpIssues.length > 0
        ? data.smtpIssues[0] : 'SMTP is not configured yet.';
      smtpHint.textContent = `Setup pending: ${issue}`;
    }
  } catch {
    healthPill.textContent = 'Unreachable';
    healthPill.className   = 'pill error';
    smtpHint.classList.add('error');
    smtpHint.textContent   = 'Cannot reach the service.';
    healthTime.textContent = new Date().toLocaleString();
  }
}

// =============================================================================
// Events timeline
// =============================================================================

function renderEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    eventList.innerHTML = '<li>No events yet.</li>';
    return;
  }
  eventList.innerHTML = events.map((e) => {
    const time    = e.timestamp ? new Date(e.timestamp).toLocaleString() : '-';
    const level   = e.level ? e.level.toUpperCase() : 'INFO';
    const message = e.message || '(no message)';
    return `<li>
      <div class="event-time">${time} · ${level}</div>
      <div class="event-message">${escapeHtml(message)}</div>
    </li>`;
  }).join('');
}

async function refreshEvents() {
  try {
    const r    = await fetch('/events?limit=8');
    const data = await r.json();
    renderEvents(data.events || []);
  } catch {
    eventList.innerHTML = '<li>Could not load events.</li>';
  }
}

// =============================================================================
// Send — build payload & send
// =============================================================================

/**
 * Build the FM payload.
 * All FM-specific metadata uses sensible fixed defaults — the template
 * body and subject are what the recipient sees. The operator never
 * needs to fill in severity/title/description manually.
 */
function buildPayload() {
  const now  = new Date();
  const from = new Date(now.getTime() + 30 * 60 * 1000);
  const to   = new Date(from.getTime() + 2 * 60 * 60 * 1000);

  const testRecipient = document.getElementById('test-email').value.trim();
  const useKarnoList  = document.getElementById('use-karno-list').checked;
  const selectedTpl   = templateSelectEl.value;

  const payload = {
    pilot_id: 'karno',
    message_id: crypto.randomUUID(),
    timestamp_utc: now.toISOString(),
    severity: 'info',
    fm_recommendation_type: 'other',
    title: 'FM notification',
    description: 'FM notification dispatched via Karno FM service.',
    valid_from_utc: from.toISOString(),
    valid_to_utc: to.toISOString(),
    constraints_summary: 'No specific constraints.',
    requested_by: 'karno-fm-ui',
    metadata: {
      asset_group: 'karno',
      estimated_flex_kwh: 0
    }
  };

  if (useKarnoList)        payload.use_karno_list       = true;
  else if (testRecipient)  payload.test_recipient_email = testRecipient;
  if (selectedTpl)         payload.template_id          = selectedTpl;

  return payload;
}

async function sendNotification() {
  const selectedTpl = templateSelectEl.value;
  if (!selectedTpl) {
    sendResultEl.className   = 'hint error';
    sendResultEl.textContent = 'Please select a template before sending.';
    return;
  }

  const testRecipient = document.getElementById('test-email').value.trim();
  const useKarnoList  = document.getElementById('use-karno-list').checked;
  if (!testRecipient && !useKarnoList) {
    sendResultEl.className   = 'hint error';
    sendResultEl.textContent = 'Please enter a recipient email or enable the Karno recipient list.';
    return;
  }

  sendResultEl.className   = 'hint';
  sendResultEl.textContent = 'Sending…';
  sendNotificationBtn.disabled = true;

  const payload = buildPayload();

  try {
    const response = await fetch('/fm-output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.status === 'accepted') {
      sendResultEl.className   = 'hint ok';
      const cnt = data.email && data.email.recipientCount > 1
        ? `Sent to ${data.email.recipientCount} recipients.`
        : 'Sent successfully.';
      sendResultEl.textContent = data.email && data.email.dryRun
        ? 'Dry run — no real email was sent.'
        : cnt;
    } else {
      sendResultEl.className   = 'hint error';
      sendResultEl.textContent = data.detail || data.message || 'Send failed.';
    }
    await Promise.all([refreshEvents(), loadHistory()]);
  } catch (err) {
    sendResultEl.className   = 'hint error';
    sendResultEl.textContent = `Error: ${err.message}`;
  } finally {
    sendNotificationBtn.disabled = false;
  }
}

// =============================================================================
// Template side-panel in Send section
// =============================================================================

function updateTemplateSidePanel(name, subject, bodyHtml) {
  if (!name) {
    sendTemplateNone.style.display = '';
    sendTemplateInfo.style.display = 'none';
  } else {
    sendTemplateNone.style.display = 'none';
    sendTemplateInfo.style.display = '';
    sendTplNameDisplay.textContent = name;
    sendTplSubjectDisplay.textContent = subject;
    if (sendPreviewBox) {
      const body = bodyHtml && bodyHtml.replace(/<[^>]+>/g, '').trim();
      sendPreviewBox.innerHTML = body
        ? bodyHtml
        : '<p style="color:#9ca3af; margin:0;">This template has no body content yet.</p>';
    }
  }
}

templateSelectEl.addEventListener('change', async () => {
  const id = templateSelectEl.value;
  if (!id) {
    templateSelectHint.textContent = '';
    updateTemplateSidePanel('', '', '');
    return;
  }

  try {
    const r = await fetch(`/templates/${id}`);
    const d = await r.json();
    if (d.template) {
      updateTemplateSidePanel(d.template.name, d.template.subject, d.template.bodyHtml);
      templateSelectHint.textContent = `Subject: ${d.template.subject}`;
    }
  } catch { /* ignore */ }
});

// =============================================================================
// Recipient list management
// =============================================================================

// When the Karno list checkbox is toggled, fetch and preview the addresses
document.getElementById('use-karno-list').addEventListener('change', async (e) => {
  if (!recipientListPreview) return;
  if (!e.target.checked) {
    recipientListPreview.style.display = 'none';
    return;
  }
  recipientListPreview.style.display = '';
  await refreshSendListPreview();
});

async function refreshListStats() {
  await loadAllLists();
}

async function loadAllLists() {
  try {
    const r    = await fetch('/karno/list/all');
    const data = await r.json();
    const lists = data.lists || [];

    const tbodyEl   = document.getElementById('lists-tbody');
    const emptyEl   = document.getElementById('lists-empty');
    const wrapEl    = document.getElementById('lists-table-wrap');

    // Update overview stat
    const active = lists.find((l) => l.active);
    if (ovRecipientCount) ovRecipientCount.textContent = active ? active.count : '0';

    // Update send-section checkbox list count label
    const listCountEl = document.getElementById('list-count');
    if (listCountEl) listCountEl.textContent = active ? active.count : '-';

    if (!tbodyEl) return;

    if (lists.length === 0) {
      emptyEl.style.display      = '';
      wrapEl.style.display       = 'none';
      return;
    }

    emptyEl.style.display  = 'none';
    wrapEl.style.display   = '';

    tbodyEl.innerHTML = lists.map((l) => {
      const date       = new Date(l.createdAt).toLocaleString();
      const activeBadge = l.active
        ? '<span class="badge badge-ok">Active</span>'
        : `<button class="btn btn-secondary btn-sm use-list-btn" data-id="${escapeHtml(l.id)}">Use this list</button>`;
      return `<tr>
        <td style="font-weight:600;">${escapeHtml(l.name)}</td>
        <td>${l.count}</td>
        <td style="font-size:0.82rem; color:var(--ink-soft);">${date}</td>
        <td>${activeBadge}</td>
        <td style="text-align:right;">
          <button class="btn btn-danger btn-sm delete-list-btn" data-id="${escapeHtml(l.id)}" style="padding:4px 10px;">Delete</button>
        </td>
      </tr>`;
    }).join('');

    // Wire up buttons
    tbodyEl.querySelectorAll('.use-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => activateList(btn.dataset.id));
    });
    tbodyEl.querySelectorAll('.delete-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteListById(btn.dataset.id));
    });

    // Also refresh the send-section list preview if checkbox is checked
    const karnoCheckbox = document.getElementById('use-karno-list');
    if (karnoCheckbox && karnoCheckbox.checked && recipientListPreview) {
      refreshSendListPreview();
    }

  } catch {
    const emptyEl = document.getElementById('lists-empty');
    if (emptyEl) emptyEl.textContent = 'Error loading lists.';
  }
}

async function activateList(id) {
  try {
    const r    = await fetch(`/karno/list/${id}/activate`, { method: 'PUT' });
    const data = await r.json();
    if (data.status === 'ok') {
      listResultEl.className   = 'hint ok';
      listResultEl.textContent = 'Active list updated.';
      await loadAllLists();
    } else {
      listResultEl.className   = 'hint error';
      listResultEl.textContent = data.message || 'Could not activate list.';
    }
  } catch (err) {
    listResultEl.className   = 'hint error';
    listResultEl.textContent = `Error: ${err.message}`;
  }
}

async function deleteListById(id) {
  if (!confirm('Delete this recipient list permanently? This cannot be undone.')) return;
  try {
    const r    = await fetch(`/karno/list/${id}`, { method: 'DELETE' });
    const data = await r.json();
    if (data.status === 'ok') {
      listResultEl.className   = 'hint ok';
      listResultEl.textContent = 'List deleted.';
      await loadAllLists();
    } else {
      listResultEl.className   = 'hint error';
      listResultEl.textContent = data.message || 'Delete failed.';
    }
  } catch (err) {
    listResultEl.className   = 'hint error';
    listResultEl.textContent = `Error: ${err.message}`;
  }
}

async function uploadList() {
  const file    = listFileInput.files && listFileInput.files[0];
  const nameEl  = document.getElementById('list-name');
  const listName = nameEl ? nameEl.value.trim() : '';

  if (!file) {
    listResultEl.className   = 'hint error';
    listResultEl.textContent = 'Select a CSV file first.';
    return;
  }

  listResultEl.className   = 'hint';
  listResultEl.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('file', file);
  if (listName) fd.append('name', listName);

  try {
    const r    = await fetch('/karno/list/add', { method: 'POST', body: fd });
    const data = await r.json();

    if (data.status === 'ok') {
      const s = data.summary;
      listResultEl.className   = 'hint ok';
      listResultEl.textContent = `"${data.list.name}" uploaded — Valid: ${s.valid}, Invalid: ${s.invalid}, Duplicates: ${s.duplicates}.${data.list.active ? ' Now active.' : ''}`;
      listFileInput.value = '';
      if (nameEl) nameEl.value = '';
      await loadAllLists();
    } else {
      listResultEl.className   = 'hint error';
      listResultEl.textContent = data.message || 'Upload failed.';
    }
  } catch (err) {
    listResultEl.className   = 'hint error';
    listResultEl.textContent = `Error: ${err.message}`;
  }
}

async function deleteList() {
  // legacy no-op — deletion is now done via deleteListById from the table
}

async function refreshSendListPreview() {
  if (!recipientListPreview) return;
  recipientListAddresses.textContent = 'Loading…';
  try {
    const r = await fetch('/karno/list/emails');
    const d = await r.json();
    if (!d.emails || d.emails.length === 0) {
      recipientListAddresses.textContent = 'No active list or list is empty. Upload and activate a list first.';
    } else {
      recipientListAddresses.innerHTML = d.emails
        .map((addr) => `<span style="display:block;">${escapeHtml(addr)}</span>`)
        .join('');
    }
  } catch {
    recipientListAddresses.textContent = 'Could not load recipient list.';
  }
}

// =============================================================================
// Template management
// =============================================================================

async function loadTemplateList() {
  try {
    const r         = await fetch('/templates');
    const data      = await r.json();
    const templates = data.templates || [];

    // Update overview counter
    if (ovTemplateCount) ovTemplateCount.textContent = templates.length;

    // Sidebar list
    if (templates.length === 0) {
      templateListEl.innerHTML = '<li class="template-list-empty">No templates yet.</li>';
    } else {
      templateListEl.innerHTML = templates.map((t) =>
        `<li class="template-list-item ${t.id === currentTemplateId ? 'active' : ''}" data-id="${escapeHtml(t.id)}">
          <span class="tpl-name">${escapeHtml(t.name)}</span>
          <span class="tpl-subject">${escapeHtml(t.subject)}</span>
        </li>`
      ).join('');
      templateListEl.querySelectorAll('.template-list-item').forEach((li) => {
        li.addEventListener('click', () => openTemplate(li.dataset.id));
      });
    }

    // FM form selector
    const prev = templateSelectEl.value;
    templateSelectEl.innerHTML = '<option value="">— No template (auto-generated format) —</option>';
    templates.forEach((t) => {
      const opt     = document.createElement('option');
      opt.value     = t.id;
      opt.textContent = t.name;
      templateSelectEl.appendChild(opt);
    });
    if (prev && templates.find((t) => t.id === prev)) templateSelectEl.value = prev;

  } catch {
    templateListEl.innerHTML = '<li class="template-list-empty">Error loading templates.</li>';
  }
}

function showTemplateEditor() {
  templateEditorEmptyEl.style.display = 'none';
  templateEditorFormEl.style.display  = '';
  templateResultEl.textContent        = '';
  templateResultEl.className          = 'hint';
}

function hideTemplateEditor() {
  templateEditorEmptyEl.style.display = '';
  templateEditorFormEl.style.display  = 'none';
  currentTemplateId = null;
}

async function openTemplate(id) {
  try {
    const r    = await fetch(`/templates/${id}`);
    const data = await r.json();
    if (!data.template) return;
    const t = data.template;
    currentTemplateId       = t.id;
    tplNameEl.value         = t.name;
    tplSubjectEl.value      = t.subject;
    quill.root.innerHTML    = t.bodyHtml || '';
    showTemplateEditor();
    templateListEl.querySelectorAll('.template-list-item').forEach((li) => {
      li.classList.toggle('active', li.dataset.id === id);
    });
  } catch {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = 'Error loading template.';
  }
}

function startNewTemplate() {
  currentTemplateId = null;
  tplNameEl.value   = '';
  tplSubjectEl.value = '';
  quill.setContents([]);
  showTemplateEditor();
  templateListEl.querySelectorAll('.template-list-item').forEach((li) => li.classList.remove('active'));
}

async function saveTemplate() {
  const name     = tplNameEl.value.trim();
  const subject  = tplSubjectEl.value.trim();
  const bodyHtml = quill.root.innerHTML;

  if (!name) {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = 'Template name is required.';
    return;
  }
  if (!subject) {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = 'Subject is required.';
    return;
  }

  const url    = currentTemplateId ? `/templates/${currentTemplateId}` : '/templates';
  const method = currentTemplateId ? 'PUT' : 'POST';

  try {
    const r    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, bodyHtml })
    });
    const data = await r.json();

    if (data.status === 'ok') {
      currentTemplateId            = data.template.id;
      templateResultEl.className   = 'hint ok';
      templateResultEl.textContent = 'Template saved successfully.';
      await loadTemplateList();
    } else {
      templateResultEl.className   = 'hint error';
      templateResultEl.textContent = data.message || 'Error saving template.';
    }
  } catch (err) {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = `Error: ${err.message}`;
  }
}

async function duplicateTemplate() {
  if (!currentTemplateId) return;
  try {
    const r    = await fetch(`/templates/${currentTemplateId}/duplicate`, { method: 'POST' });
    const data = await r.json();
    if (data.status === 'ok') {
      await loadTemplateList();
      await openTemplate(data.template.id);
    } else {
      templateResultEl.className   = 'hint error';
      templateResultEl.textContent = data.message || 'Error duplicating template.';
    }
  } catch (err) {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = `Error: ${err.message}`;
  }
}

async function deleteTemplate() {
  if (!currentTemplateId) return;
  if (!confirm('Delete this template? This cannot be undone.')) return;
  try {
    const r    = await fetch(`/templates/${currentTemplateId}`, { method: 'DELETE' });
    const data = await r.json();
    if (data.status === 'ok') {
      hideTemplateEditor();
      await loadTemplateList();
    } else {
      templateResultEl.className   = 'hint error';
      templateResultEl.textContent = data.message || 'Error deleting template.';
    }
  } catch (err) {
    templateResultEl.className   = 'hint error';
    templateResultEl.textContent = `Error: ${err.message}`;
  }
}

function openPreview() {
  const subject = tplSubjectEl.value.trim() || '(no subject)';
  previewSubjectEl.textContent = subject;
  previewBodyEl.innerHTML      = quill.root.innerHTML;
  previewModal.showModal();
}

// =============================================================================
// Send history
// =============================================================================

const SEVERITY_LABELS = { info: 'Info', warning: 'Warning', critical: 'Critical' };
const TYPE_LABELS = {
  setpoint_adjustment: 'Setpoint adjustment',
  charge_storage:      'Charge storage',
  load_shift:          'Load shift',
  other:               'Other'
};
const STATUS_LABELS = { sent: 'Sent', dry_run: 'Simulated', failed: 'Failed' };

function applyHistoryFilter() {
  const filtered = activeFilter === 'all'
    ? allHistory
    : allHistory.filter((e) => e.status === activeFilter);

  if (filtered.length === 0) {
    historyEmptyEl.style.display  = '';
    historyTableEl.style.display  = 'none';
    historyEmptyEl.textContent    = activeFilter === 'all'
      ? 'No sends recorded yet.'
      : `No entries with status "${activeFilter}".`;
    return;
  }

  historyEmptyEl.style.display = 'none';
  historyTableEl.style.display = '';

  historyTbodyEl.innerHTML = filtered.map((e) => {
    const date          = new Date(e.sentAt).toLocaleString();
    const recipientInfo = e.recipientType === 'karno_list'
      ? `List (${e.recipientCount})`
      : 'Individual';
    const statusClass   = e.status === 'sent' ? 'badge-ok' : e.status === 'dry_run' ? 'badge-dry' : 'badge-err';
    const statusLabel   = STATUS_LABELS[e.status] || e.status;
    const dryBadge      = e.dryRun ? ' <span class="badge badge-dry">DRY</span>' : '';
    const rowId         = `hr-${escapeHtml(e.id)}`;
    const detailId      = `hd-${escapeHtml(e.id)}`;

    const mainRow = `<tr class="history-row-main" data-row-id="${rowId}" data-detail-id="${detailId}" data-template-id="${escapeHtml(e.templateId || '')}" data-dry="${e.dryRun}" data-subject="${escapeHtml(e.subject || '')}" data-recipient-address="${escapeHtml(e.recipientAddress || '')}" data-recipient-emails="${escapeHtml(e.recipientEmails ? e.recipientEmails.join(',') : '')}" data-recipient-type="${escapeHtml(e.recipientType || '')}">
      <td><span class="expand-icon">▶</span>${date}</td>
      <td class="history-subject">${escapeHtml(e.subject || '-')}</td>
      <td>${escapeHtml(recipientInfo)}</td>
      <td>${SEVERITY_LABELS[e.severity] || e.severity || '-'}</td>
      <td>${e.templateName ? escapeHtml(e.templateName) : '<span class="muted">—</span>'}</td>
      <td>${TYPE_LABELS[e.recommendationType] || e.recommendationType || '-'}</td>
      <td><span class="badge ${statusClass}">${statusLabel}</span>${dryBadge}</td>
    </tr>`;

    const detailRow = `<tr class="history-row-detail" id="${detailId}" style="display:none;">
      <td colspan="7"><div class="history-detail-inner" id="inner-${escapeHtml(e.id)}"><p class="muted" style="margin:0;">Loading…</p></div></td>
    </tr>`;

    return mainRow + detailRow;
  }).join('');

  // Wire up click-to-expand
  historyTbodyEl.querySelectorAll('.history-row-main').forEach((row) => {
    row.addEventListener('click', () => toggleHistoryRow(row));
  });
}

function renderOverviewHistory(entries) {
  if (!entries || entries.length === 0) {
    ovHistoryList.innerHTML = '<p class="empty-state">No sends recorded yet.</p>';
    return;
  }
  const recent = entries.slice(0, 5);
  ovHistoryList.innerHTML = recent.map((e) => {
    const statusClass = e.status === 'sent' ? 'badge-ok' : e.status === 'dry_run' ? 'badge-dry' : 'badge-err';
    const statusLabel = STATUS_LABELS[e.status] || e.status;
    const date        = new Date(e.sentAt).toLocaleString();
    return `<div class="ov-history-row">
      <div>
        <div class="ov-hr-subject">${escapeHtml(e.subject || '-')}</div>
        <div class="ov-hr-meta">${date}</div>
      </div>
      <span class="badge ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join('');
}

async function loadHistory() {
  try {
    const r    = await fetch('/history?limit=30');
    const data = await r.json();
    allHistory = data.history || [];
    applyHistoryFilter();
    renderOverviewHistory(allHistory);
  } catch {
    historyEmptyEl.textContent = 'Error loading history.';
    ovHistoryList.innerHTML    = '<p class="empty-state">Error loading history.</p>';
  }
}

// History filter buttons
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyHistoryFilter();
  });
});

// =============================================================================
// History row expand/collapse
// =============================================================================

async function toggleHistoryRow(row) {
  const detailId  = row.dataset.detailId;
  const detailRow = document.getElementById(detailId);
  if (!detailRow) return;

  const isOpen = detailRow.style.display !== 'none';

  if (isOpen) {
    detailRow.style.display = 'none';
    row.classList.remove('expanded');
    return;
  }

  detailRow.style.display = '';
  row.classList.add('expanded');

  const innerId    = `inner-${detailId.replace('hd-', '')}`;
  const innerEl    = document.getElementById(innerId);
  const templateId = row.dataset.templateId;
  const subject    = row.dataset.subject;
  const isDryRun   = row.dataset.dry === 'true';
  const recipientAddress = row.dataset.recipientAddress;
  const recipientEmails  = row.dataset.recipientEmails
    ? row.dataset.recipientEmails.split(',').filter(Boolean)
    : [];
  const recipientType = row.dataset.recipientType;

  // Build recipient block
  let recipientHtml = '';
  if (recipientType === 'karno_list' && recipientEmails.length > 0) {
    const items = recipientEmails.map((a) => `<span style="display:block;">${escapeHtml(a)}</span>`).join('');
    recipientHtml = `<div style="margin-bottom:14px;">
      <p style="margin:0 0 6px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft);">Sent to list (${recipientEmails.length} recipients)</p>
      <div style="max-height:140px; overflow-y:auto; border:1px solid var(--line); border-radius:var(--radius); padding:8px 12px; background:var(--bg); font-size:0.83rem; line-height:1.8;">${items}</div>
    </div>`;
  } else if (recipientAddress) {
    recipientHtml = `<div style="margin-bottom:14px;">
      <p style="margin:0 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft);">Sent to</p>
      <span style="font-size:0.88rem;">${escapeHtml(recipientAddress)}</span>
    </div>`;
  }

  if (!templateId) {
    // No template — show plain-text auto-generated note
    innerEl.innerHTML = `
      <h4>Email content</h4>
      ${recipientHtml}
      <p class="muted" style="margin:0 0 8px;">Subject: ${escapeHtml(subject || '-')}</p>
      <div class="history-preview-text">This notification used the auto-generated plain-text format. No HTML template was attached.</div>
      ${isDryRun ? '<p class="hint" style="margin-top:10px;">This was a dry-run — no real email was sent.</p>' : ''}
    `;
    return;
  }

  // Fetch template for preview
  try {
    const r = await fetch(`/templates/${templateId}`);
    const d = await r.json();
    if (!d.template) throw new Error('not found');
    innerEl.innerHTML = `
      <h4>Email preview — ${escapeHtml(d.template.name)}</h4>
      ${recipientHtml}
      <p class="muted" style="margin:0 0 10px;">Subject: ${escapeHtml(d.template.subject)}</p>
      <div class="history-preview-html">${d.template.bodyHtml || '<span style="color:#9ca3af">Empty body.</span>'}</div>
      ${isDryRun ? '<p class="hint" style="margin-top:10px;">This was a dry-run — no real email was sent.</p>' : ''}
    `;
  } catch {
    innerEl.innerHTML = '<p class="hint error" style="margin:0;">Could not load template preview.</p>';
  }
}

// =============================================================================
// Quill initialisation
// =============================================================================

quill = new Quill('#quill-editor', {
  theme: 'snow',
  placeholder: 'Write the email content here…',
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link'],
      ['clean']
    ]
  }
});

// =============================================================================
// Event listeners
// =============================================================================

checkHealthButton.addEventListener('click', checkHealth);
refreshEventsButton.addEventListener('click', refreshEvents);

// Simplified send button
if (sendNotificationBtn) {
  sendNotificationBtn.addEventListener('click', sendNotification);
}

refreshListStatsButton.addEventListener('click', refreshListStats);
uploadListButton.addEventListener('click', uploadList);
deleteListButton.addEventListener('click', deleteList);

newTemplateBtnEl.addEventListener('click', startNewTemplate);
saveTemplateBtnEl.addEventListener('click', saveTemplate);
deleteTemplateBtnEl.addEventListener('click', deleteTemplate);
duplicateTemplateBtnEl.addEventListener('click', duplicateTemplate);
previewTemplateBtnEl.addEventListener('click', openPreview);
closePreviewBtnEl.addEventListener('click', () => previewModal.close());

refreshHistoryBtnEl.addEventListener('click', loadHistory);

// =============================================================================
// Initial load
// =============================================================================

checkHealth();
refreshEvents();
loadAllLists();
loadTemplateList();
loadHistory();

setInterval(refreshEvents, 10000);
