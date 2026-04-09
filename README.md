# Leonor Birthday Invitation

Static web invitation for Leonor's first birthday, with RSVP automation, interactive party effects, and a personalized thank-you flow.

## Features

- Animated hero with Minnie iframe art loaded from `pages/minnie-art.html`.
- Live countdown based on configurable event date/time.
- Background music with autoplay fallback, fade in/out, and floating toggle control.
- Auto-start music flow with configurable auto-pause after N completed cycles (default: 3), then manual resume via toggle button.
- First-visit loading experience (shown once per device via localStorage).
- Party mini-game (runner/obstacles) with score and local best score persistence.
- RSVP form with validation for required fields, email format, numeric phone, and guest count range (1 to 20).
- Hidden honeypot field to reduce spam bot submissions.
- RSVP submission to a Pipedream webhook (`POST` JSON).
- Webhook-first automation model: form data is sent to Pipedream, where downstream actions can send emails and append records to Excel.
- Optional digital ticket generation and code forwarding to the thank-you page.
- Optional single-submission lock per device via localStorage.
- Event details panel with quick contact actions (SMS, call, WhatsApp).
- Location link opening Google Maps directions, plus embedded map view.
- Thank-you page with personalized message by attendance type.
- Digital ticket display only for `coming` or `maybe`, with PNG download.
- Calendar actions on thank-you page (Google Calendar link + `.ics` download).
- Global maintenance mode switch that redirects all pages to a maintenance screen.
- Cloudflare Web Analytics enabled.

## Project Structure

- `index.html`: main invitation page and RSVP form.
- `assets/css/convite.css`: main stylesheet aggregator (`@import`) for invitation styles.
- `assets/css/convite-base.css`: design tokens, reset, and global base styles.
- `assets/css/convite-overlay.css`: audio controls, loader, and global confetti layer styles.
- `assets/css/convite-content.css`: page layout, Minnie section, details panel, form, map, and feedback styles.
- `assets/css/convite-motion.css`: animations and keyframes used by invitation interactions.
- `assets/css/convite-responsive.css`: responsive and reduced-motion media-query overrides.
- `assets/css/party-runner.css`: mini-game visual styles.
- `assets/js/pt-pt-config.js`: centralized PT-PT text catalog for UI copy (invitation runtime messages and mini-game labels).
- `assets/js/convite-shared.js`: shared invitation state, runtime config (`INVITE_CONFIG`), DOM references, text fallbacks, and helpers.
- `assets/js/convite-audio-loader.js`: first-visit loader plus background-music control and autoplay fallback behavior.
- `assets/js/convite-minnie.js`: Minnie interactions and sitewide confetti effects.
- `assets/js/convite-form.js`: config application, countdown update, RSVP validation/submission, and submission lock handling.
- `assets/js/convite-init.js`: invitation initializer/orchestrator wiring all modules together.
- `assets/js/convite.js`: lightweight bootstrap that calls the modular initializer.
- `assets/js/party-runner.js`: mini-game logic (runner with obstacles, score, restart, local best score).
- `assets/js/site-mode.js`: global maintenance mode controller.
- `pages/minnie-art.html`: Minnie artwork rendered in an iframe.
- `pages/agradecimento.html`: personalized confirmation page with ticket and calendar actions.
- `pages/manutencao.html`: maintenance mode landing page.
- `assets/media/audio.mp3`: background audio track.
- `assets/media/favicon.svg`: favicon used across pages.

## Run Locally

1. Open a terminal in the project folder.
2. Start a local static server:

```bash
python -m http.server 8080
```

3. Open in the browser:

```text
http://localhost:8080/
```

Opening with `file://` may break webhook submission due to browser/network restrictions.

## Testing (Playwright E2E)

This repository includes browser E2E tests covering RSVP reliability, thank-you behavior, and maintenance-mode routing.

### Install dependencies

```bash
npm install
```

### Install Playwright browser

```bash
npx playwright install chromium
```

### Run the full E2E suite

```bash
npm run test:e2e
```

Optional:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

### Current critical scenarios covered

- Required fields validation.
- Invalid email validation.
- Guest count range validation (`1` to `20`).
- Honeypot behavior (early success path without webhook call).
- Successful submit: payload contract and redirect query params.
- Webhook error feedback and submit-button recovery.
- Single-submission lock after successful submit and return to invite page.
- Duplicate-submit protection for fast repeated user clicks.
- Thank-you page personalization by attendance and fallback guest context.
- Digital ticket visibility rules (`coming`/`maybe` only and `ingressoAtivo` gate).
- Thank-you calendar actions (Google Calendar link contract and `.ics` download).
- Maintenance mode redirects from root and `/pages` routes.
- Maintenance page self-bypass (no redirect loop while mode is active).

Test file:

- `tests/e2e/rsvp-form.spec.js`
- `tests/e2e/agradecimento-manutencao.spec.js`

## Tooling

- Runtime: static HTML, CSS, and vanilla JavaScript.
- Test automation: Playwright (`@playwright/test`).
- Local static server used by tests: `http-server`.
- Optional manual local server: `python -m http.server`.

## Analytics

- Cloudflare Web Analytics script is embedded in the main pages.
- This gives lightweight page analytics without adding application-side tracking logic.

## Configuration

Main runtime settings are in the `INVITE_CONFIG` object in `assets/js/convite-shared.js`.

Key fields:

- `themeEyebrow`, `title`, `heroSubtitle`.
- `eventDateISO`, `eventTimezone`, `eventDateText`, `eventTimeText`.
- `eventLocationText`, `confirmUntilText`, `parkingInfoText`.
- `quickContactText`, `quickContactPhone`, `quickContactSmsMessage`, `quickContactWhatsappMessage`.
- `mapUrl`, `mapDirectionsUrl`, `mapEmbedUrl`.
- `backgroundMusicUrl`, `backgroundMusicVolume`, `backgroundMusicAutoPauseAfterCycles`.
- `emailService.endpoint`, `emailService.enabled`.
- `features.enableDigitalTicket`, `features.enableSingleSubmissionLock`.

Global maintenance behavior is configured in `assets/js/site-mode.js` (`SITE_MODE_CONFIG`).

## RSVP Webhook Setup (Pipedream)

1. Create a Pipedream HTTP endpoint.
2. Set `INVITE_CONFIG.emailService.endpoint` to the webhook URL.
3. Keep `INVITE_CONFIG.emailService.enabled` as `true`.
4. Submit a test RSVP from the site.

Current payload includes:

- `source`, `submittedAt`.
- `name`, `email`, `phone`, `guests`.
- `attendance`, `attendanceLabel`, `message`.
- `eventTitle`, `eventDateText`, `eventTimeText`, `eventLocation`.
- `ticketCode` when digital ticket is enabled.

## Pipedream Workflow Logic (Email + Excel)

The website only submits RSVP data to the webhook endpoint. Email sending and Excel persistence happen in the Pipedream workflow (outside this repository).

Recommended workflow steps in Pipedream:

1. HTTP Trigger receives RSVP JSON.
2. (Optional) Validate/normalize payload and reject malformed data.
3. Send notification email to organizers with RSVP details.
4. (Optional) Send confirmation email to the guest.
5. Append a new row to Excel (Microsoft 365 Excel Online table) with fields such as:
	- `submittedAt`, `name`, `email`, `phone`, `guests`, `attendance`, `message`, `ticketCode`
6. (Optional) Add deduplication/check rules before writing to Excel.

Notes:

- Excel writes require a table in an `.xlsx` file (OneDrive/SharePoint) when using Excel Online connectors.
- If preferred, the same flow can target Google Sheets instead of Excel.

## Maintenance Mode

To enable maintenance mode for all pages:

1. Open `assets/js/site-mode.js`.
2. Set `SITE_MODE_CONFIG.enableMaintenanceMode` to `true`.
3. Keep `maintenancePagePath` pointing to `pages/manutencao.html` (or change if needed).

When enabled, every page redirects to the maintenance page, except the maintenance page itself.

## Deployment

This is a static website and can be deployed on Netlify, GitHub Pages, Cloudflare Pages, or any static host.

## Notes

- Loader key: `leonor_invite_first_visit_loader_v1`.
- Submission lock key: `leonor_invite_submission_lock_v1`.
- Background music auto-pause default: `backgroundMusicAutoPauseAfterCycles = 3`.
- Phone input is normalized to digits only before submit.
- Thank-you ticket visibility depends on attendance and digital-ticket feature flag.
