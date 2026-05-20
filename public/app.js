const healthPill = document.getElementById('health-pill');
const envValue = document.getElementById('env-value');
const dryValue = document.getElementById('dry-value');
const smtpValue = document.getElementById('smtp-value');
const smtpHint = document.getElementById('smtp-hint');
const healthTime = document.getElementById('health-time');
const checkHealthButton = document.getElementById('check-health');
const refreshEventsButton = document.getElementById('refresh-events');
const eventList = document.getElementById('event-list');
const fmForm = document.getElementById('fm-form');
const responseBox = document.getElementById('response-box');
const loadSampleButton = document.getElementById('load-sample');

function setDefaultTimes() {
  const now = new Date();
  const from = new Date(now.getTime() + 30 * 60 * 1000);
  const to = new Date(from.getTime() + 2 * 60 * 60 * 1000);

  document.getElementById('from').value = toDatetimeLocal(from);
  document.getElementById('to').value = toDatetimeLocal(to);
}

function toDatetimeLocal(date) {
  const pad = (value) => String(value).padStart(2, '0');

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function fromDatetimeLocalToUtc(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}:00Z`).toISOString();
}

async function checkHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();

    healthPill.textContent = data.status === 'ok' ? 'Operational' : 'Unavailable';
    healthPill.classList.remove('ok', 'error');
    healthPill.classList.add(data.status === 'ok' ? 'ok' : 'error');

    envValue.textContent = data.env || '-';
    dryValue.textContent = data.emailDryRun ? 'Dry run (no real email)' : 'Real SMTP';
    smtpValue.textContent = data.smtpReady ? 'Ready' : 'Not ready';

    smtpHint.classList.remove('ok', 'error');
    if (data.smtpReady) {
      smtpHint.classList.add('ok');
      smtpHint.textContent = 'SMTP is configured. You can use a temporary inbox address in the test recipient field and send a real email.';
    } else {
      smtpHint.classList.add('error');
      const firstIssue = Array.isArray(data.smtpIssues) && data.smtpIssues.length > 0
        ? data.smtpIssues[0]
        : 'SMTP is not configured yet.';
      smtpHint.textContent = `SMTP setup pending: ${firstIssue}`;
    }

    healthTime.textContent = new Date(data.timestamp).toLocaleString();
  } catch (error) {
    healthPill.textContent = 'Connection error';
    healthPill.classList.remove('ok');
    healthPill.classList.add('error');
    smtpValue.textContent = 'Unknown';
    smtpHint.classList.remove('ok');
    smtpHint.classList.add('error');
    smtpHint.textContent = 'Cannot check SMTP readiness because the service is unreachable.';
    healthTime.textContent = new Date().toLocaleString();
  }
}

function renderEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    eventList.innerHTML = '<li>No events yet.</li>';
    return;
  }

  eventList.innerHTML = events.map((event) => {
    const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : 'no time';
    const level = event.level ? event.level.toUpperCase() : 'INFO';
    const message = event.message || '(no message)';

    return `<li>
      <div class="event-time">${time} · ${level}</div>
      <div class="event-message">${message}</div>
    </li>`;
  }).join('');
}

async function refreshEvents() {
  try {
    const response = await fetch('/events?limit=8');
    const data = await response.json();
    renderEvents(data.events || []);
  } catch (error) {
    eventList.innerHTML = '<li>Could not load events.</li>';
  }
}

function buildPayload() {
  const fromUtc = fromDatetimeLocalToUtc(document.getElementById('from').value);
  const toUtc = fromDatetimeLocalToUtc(document.getElementById('to').value);
  const testRecipient = document.getElementById('test-email').value.trim();

  return {
    pilot_id: 'karno',
    message_id: crypto.randomUUID(),
    timestamp_utc: new Date().toISOString(),
    severity: document.getElementById('severity').value,
    fm_recommendation_type: document.getElementById('type').value,
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    valid_from_utc: fromUtc,
    valid_to_utc: toUtc,
    constraints_summary: document.getElementById('constraints').value,
    requested_by: 'FM-simulator-ui',
    metadata: {
      asset_group: document.getElementById('asset').value,
      estimated_flex_kwh: Number(document.getElementById('flex').value)
    },
    test_recipient_email: testRecipient || undefined
  };
}

async function sendSimulation(event) {
  event.preventDefault();

  const payload = buildPayload();

  responseBox.textContent = 'Sending...';

  try {
    const response = await fetch('/fm-output', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    responseBox.textContent = JSON.stringify(data, null, 2);
    await refreshEvents();
  } catch (error) {
    responseBox.textContent = `Error: ${error.message}`;
  }
}

function loadSampleValues() {
  document.getElementById('severity').value = 'warning';
  document.getElementById('type').value = 'charge_storage';
  document.getElementById('title').value = 'Increase thermal storage charge';
  document.getElementById('description').value = 'Charge thermal storage due to expected price increase later in the day.';
  document.getElementById('constraints').value = 'Maintain comfort and max network flow limits.';
  document.getElementById('test-email').value = '';
  document.getElementById('asset').value = 'thermal_network_zone_A';
  document.getElementById('flex').value = '42.5';
  setDefaultTimes();
}

checkHealthButton.addEventListener('click', checkHealth);
refreshEventsButton.addEventListener('click', refreshEvents);
fmForm.addEventListener('submit', sendSimulation);
loadSampleButton.addEventListener('click', loadSampleValues);

loadSampleValues();
checkHealth();
refreshEvents();
setInterval(refreshEvents, 10000);
