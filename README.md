# BlueBird FM Email PoC

Simple PoC for BlueBird to simulate a Flexibility Manager (FM) output and validate the email notification flow.

## What this app does

- Exposes `POST /fm-output` to receive a simulated FM output.
- Validates the incoming payload.
- Builds a structured email message.
- Sends email through SMTP, or simulates delivery when `EMAIL_DRY_RUN=true`.
- Stores event logs in `logs/app.log`.
- Provides a browser dashboard for non-technical demos.

## Requirements

- Node.js 18+ (for local run)
- Docker Desktop + Docker Compose (for container run)

## Quick start (Windows)

1. Copy `.env.example` to `.env`.
2. Set `EMAIL_DRY_RUN=true` in `.env` to test without a real SMTP server.
3. Make sure Docker Desktop is running.
4. Double-click `start-docker.bat`.

The script will build the image, start the container, and open the dashboard in your browser.

## Local setup (without Docker)

1. Copy `.env.example` to `.env`.
2. Update SMTP values and recipients, or set `EMAIL_DRY_RUN=true` to skip real email delivery.

Install and run:

```bash
npm install
npm start
```

The app runs on `http://127.0.0.1:3050` by default.

## Docker setup

1. Copy `.env.example` to `.env` and adjust values (or keep `EMAIL_DRY_RUN=true` for testing).
2. Build and start the container:

```bash
docker compose up --build
```

3. Open `http://127.0.0.1:3050` in your browser.

> **Note:** The container maps external port **3050** to internal port 3000. This avoids conflicts with other services that may use port 3000. You can change the external port in `docker-compose.yml` under `ports`.

Stop the stack:

```bash
docker compose down
```

## Demo dashboard

Open `http://127.0.0.1:3050` in a browser.

The dashboard allows you to:

- Check service status and email mode.
- Submit a simulated FM recommendation.
- Optionally set a one-off test recipient email per submission.
- View API responses.
- Display recent events from logs.


## API endpoints

### GET /health

Basic health endpoint.

### GET /events

Returns recent events from `logs/app.log`.

### POST /fm-output

Receives simulated FM output for BlueBird.

Optional field:

- `test_recipient_email`: if provided, overrides the default `SMTP_TO` recipient for that single request.

Sample payload is available in `sample-payload.json`.

Example:

```bash
curl -X POST http://127.0.0.1:3050/fm-output \
  -H "Content-Type: application/json" \
  --data @sample-payload.json
```

## Expected responses

- `202 Accepted`: valid payload and notification flow executed.
- `400 Bad Request`: invalid payload.
- `502 Bad Gateway`: valid payload but SMTP send failed.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Internal server port | `3000` |
| `APP_ENV` | Environment name | `development` |
| `EMAIL_DRY_RUN` | `true` to simulate emails without SMTP | `false` |
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | Sender email address | — |
| `SMTP_TO` | Default recipient email | — |

## Next evolution ideas

- Replace simulated sender with real FM integration without changing HTTP contract.
- Add source authentication.
- Add retries/queue for resilience.
- Add persistence and extended traceability.
