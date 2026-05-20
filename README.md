# Karno FM Email PoC

Simple PoC for BlueBird/Karno to simulate a Flexibility Manager (FM) output and validate the email notification flow.

## What this app does

- Exposes `POST /fm-output` to receive a simulated FM output.
- Validates the incoming payload.
- Builds a structured email message.
- Sends email through SMTP, or simulates delivery when `EMAIL_DRY_RUN=true`.
- Stores event logs in `logs/app.log`.
- Provides a browser dashboard for non-technical demos.

## Requirements

- Node.js 18+ (for local run)
- Docker + Docker Compose (for container run)

## Local setup

1. Copy `.env.example` to `.env`.
2. Update SMTP values and recipients.
3. Keep `EMAIL_DRY_RUN=true` to test without real email delivery.

Install and run:

```bash
npm install
npm start
```

The app runs on `http://localhost:3000` by default.

## Docker setup

1. Copy `.env.example` to `.env` and adjust values.
2. Build and start the container:

```bash
docker compose up --build
```

3. Open `http://localhost:3000`.

Stop the stack:

```bash
docker compose down
```

## Demo dashboard

Open `http://localhost:3000` in a browser.

The dashboard allows you to:

- Check service status and email mode.
- Submit a simulated FM recommendation.
- Optionally set a one-off test recipient email per submission.
- View API responses.
- Display recent events from logs.

## Temporary inbox demo flow (for Edu)

1. Open the dashboard and click `Check status`.
2. Confirm `Email mode` is `Real SMTP`.
3. Confirm `SMTP readiness` is `Ready`.
4. Open any temporary inbox provider and copy a disposable email address.
5. Paste that address in `Test recipient email (optional)`.
6. Click `Send simulation`.
7. Confirm the API response shows:
  - `"sent": true`
  - `"to": "<temporary-email>"`
8. Refresh the temporary inbox page and show the received recommendation email.

If `SMTP readiness` is `Not ready`, update `.env` with real SMTP values and restart the app.

## API endpoints

### GET /health

Basic health endpoint.

### GET /events

Returns recent events from `logs/app.log`.

### POST /fm-output

Receives simulated FM output for Karno.

Optional field:

- `test_recipient_email`: if provided, overrides the default `SMTP_TO` recipient for that single request.

Sample payload is available in `sample-payload.json`.

Example:

```bash
curl -X POST http://localhost:3000/fm-output \
  -H "Content-Type: application/json" \
  --data @sample-payload.json
```

## Expected responses

- `202 Accepted`: valid payload and notification flow executed.
- `400 Bad Request`: invalid payload.
- `502 Bad Gateway`: valid payload but SMTP send failed.

## Next evolution ideas

- Replace simulated sender with real FM integration without changing HTTP contract.
- Add source authentication.
- Add retries/queue for resilience.
- Add persistence and extended traceability.
