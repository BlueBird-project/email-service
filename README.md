# BlueBird FM Email Service

A modern web dashboard for managing and dispatching FM (Flexibility Manager) notifications to pilots. Built for the Karno pilot project, featuring multi-template support, recipient list management, and a streamlined operator interface.

## Features

### 📊 Dashboard
- **Overview** — Real-time service status, SMTP readiness, recipient counts, recent send history
- **Send** — Simplified interface to choose a template and send to individual email or recipient list; live preview of how the email will look
- **Recipients** — Upload multiple CSV recipient lists and toggle between them without re-uploading
- **Email Templates** — Visual HTML editor to create and manage reusable notification templates
- **Send History** — Expandable rows showing exactly who received each notification, with template preview

### 🎨 Modern UI
- Clean sidebar navigation with blue accent color scheme
- Responsive design (desktop and mobile)
- Sticky email preview panel (stays visible while scrolling)
- Dark terminal-style API response viewer
- Inline validation and user feedback

### 📋 Recipient List Management
- Upload multiple CSV files with an `email` column
- Name each list (auto-named from filename if not provided)
- One list is always "active" — that's the one used for sending
- Easily switch active lists or delete old ones
- List addresses are shown in the Send section before you click Send

### 🧩 Email Templates
- Create HTML templates with a visual editor (Quill.js)
- Support for formatting: headings, bold, italic, colors, lists, links
- Each template has a name and email subject line
- Duplicate any template to quickly create variants
- Live preview in Send section shows how the email will look
- Template body is rendered in-browser when viewing send history

### 📤 Sending
- Choose a template and recipient (individual email or active list)
- Preview the full email mockup before sending
- See recipient list addresses inline
- Dry-run mode available (test without real SMTP)
- Inline success/error messages with recipient counts

### 📊 Send History
- Expandable table rows — click to see full details
- Shows template name, recipient(s), status, and send date
- Expandable rows display the complete email template body as it was sent
- Dry-run indicator for test sends
- Filter by status (all, sent, dry_run, error)

## Technical Overview

### Backend
- **Node.js + Express** — REST API for all operations
- **Multer** — Safe in-memory CSV file processing (no disk writes)
- **Nodemailer** — SMTP integration with support for dry-run mode
- **Zod** — Payload validation (ensures FM metadata structure)
- **JSON-based storage** — Recipient lists and templates persisted to `data/` directory

### Frontend
- **Vanilla JavaScript** — No framework dependency for simplicity
- **Responsive CSS Grid** — Layout adapts to screen size
- **Quill.js** — Rich HTML editor for templates
- **File upload handling** — CSV parsing and validation in-browser feedback

### Data Privacy
- Email addresses are stored server-side only (for sending)
- They are NOT included in API logs or responses (except when viewing history)
- CSV files are never written to disk — processed in memory only
- All data persists in `data/` (ignored by `.gitignore`)

## API Endpoints

### Health & Status
- `GET /health` — Service status, SMTP readiness, environment

### Send Notifications
- `POST /fm-output` — Send an FM notification

### Recipient Lists
- `GET /karno/list/stats` — Active list statistics
- `GET /karno/list/emails` — Email addresses in active list (operator-visible)
- `GET /karno/list/all` — All saved lists with active flag
- `POST /karno/list/add` — Upload a new recipient list (doesn't replace others)
- `PUT /karno/list/:id/activate` — Set a list as active
- `DELETE /karno/list/:id` — Delete a specific list

### Email Templates
- `GET /templates` — List all templates
- `GET /templates/:id` — Get template details (name, subject, HTML body)
- `POST /templates` — Create a new template
- `PUT /templates/:id` — Update a template
- `DELETE /templates/:id` — Delete a template

### Send History
- `GET /history` — Retrieve recent sends (with recipient info, template details, etc.)

## Quick Start

### Docker (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/BlueBird-project/email-service.git
cd email-service

# 2. Create .env from template
cp .env.example .env

# 3. Edit .env with your SMTP settings (or keep EMAIL_DRY_RUN=true for testing)

# 4. Start the service
docker compose up --build -d
```

Open **http://localhost:3050** in your browser.

### Local Node.js Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure .env
cp .env.example .env
# Edit SMTP values or set EMAIL_DRY_RUN=true

# 3. Start the server
npm start
```

The app runs on **http://localhost:3050** (for backwards compatibility with Docker).

## Environment Configuration

Create a `.env` file from `.env.example`:

```env
PORT=3000
APP_ENV=development
EMAIL_DRY_RUN=false

# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=bluebird@example.com
SMTP_TO=team@example.com
```

**Key variables:**
- `EMAIL_DRY_RUN=true` — Test mode (no real email sent, simulated delivery)
- `SMTP_*` — Your email server credentials
- `SMTP_FROM` — Sender email address
- `SMTP_TO` — Default recipient (overridable per send)

## Project Structure

```
.
├── src/
│   ├── server.js              # Express app entry point
│   ├── emailService.js        # Email sending logic + payload building
│   ├── validation.js          # Zod schemas for FM payload
│   ├── listRoutes.js          # Recipient list endpoints
│   ├── recipientList.js       # Multi-list management logic
│   ├── templateRoutes.js      # Template CRUD endpoints
│   ├── history.js             # Send history storage
│   ├── config.js              # Environment configuration
│   ├── logger.js              # Application logging
│   └── ...
├── public/
│   ├── index.html             # Dashboard UI
│   ├── app.js                 # Frontend logic & API calls
│   ├── styles.css             # Blue-themed stylesheet
│   └── ...
├── docker-compose.yml         # Multi-container orchestration
├── Dockerfile                 # Container image definition
├── package.json               # Node.js dependencies
├── .env.example               # Environment template
└── README.md                  # This file
```

## Workflow Example

1. **Setup recipients** → Go to Recipients tab, upload a CSV file with emails
2. **Create a template** → Go to Email Templates, click "+ New template", add subject and HTML body
3. **Send notification** → Go to Send, select template, choose recipient (list or individual), review preview, click "Send notification"
4. **Check history** → Go to Send History, click any row to expand and see full email + recipient list
5. **Switch lists** → In Recipients, click "Use this list" to activate a different recipient list
6. **Modify template** → In Email Templates, select a template and edit, then save

## Notes for Deployment

- **Port mapping** — Docker exposes port 3050 (change in `docker-compose.yml` if needed)
- **Data persistence** — `logs/` and `data/` directories are mounted as Docker volumes
- **No restart policy** — Set to `unless-stopped` (survives docker daemon restart)
- **CSV file size limit** — 1 MB per file (configured in multer)
- **Email character limit** — Templates can be up to 64 KB (HTTP body limit)

## Development

### Install dependencies
```bash
npm install
```

### Run locally
```bash
npm start
```

### Build Docker image
```bash
docker compose build
```

### View logs
```bash
docker logs -f karno-fm-email-poc
```

## Troubleshooting

**Q: I can't see the recipient list after uploading**  
→ Click "Refresh" or go to another section and back. The list should appear in the Recipients table.

**Q: The email template isn't showing in Send preview**  
→ Make sure you saved the template. Refresh the page and try selecting it again.

**Q: Sending fails with "Invalid FM output payload"**  
→ Check that the request includes all required FM fields (severity, title, description, etc.). The backend validates against a Zod schema.

**Q: Email isn't being sent but no error shown**  
→ Check if `EMAIL_DRY_RUN=true` in your `.env`. If yes, it's simulating delivery. For real send, set it to `false` and ensure SMTP is configured.

## License

Part of the BlueBird project.


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
