# Leonor Birthday Invitation

Static web invitation for Leonor's first birthday, with RSVP automation, interactive party effects, and a personalized thank-you flow.

## Features

- Animated hero with Minnie iframe art loaded from `pages/minnie-art.html`.
- Live countdown based on configurable event date/time.
- Background music with autoplay fallback, fade in/out, and floating toggle control.
- First-visit loading experience (shown once per device via localStorage).
- RSVP form with validation for required fields, email format, numeric phone, and guest count range (1 to 20).
- Hidden honeypot field to reduce spam bot submissions.
- RSVP submission to a Pipedream webhook (`POST` JSON).
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
- `assets/css/convite.css`: layout, theme, responsiveness, and interaction styles.
- `assets/js/convite.js`: invitation configuration, countdown, audio, confetti, validation, webhook submit, and redirect logic.
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

## Configuration

Main runtime settings are in the `INVITE_CONFIG` object in `assets/js/convite.js`.

Key fields:

- `themeEyebrow`, `title`, `heroSubtitle`.
- `eventDateISO`, `eventTimezone`, `eventDateText`, `eventTimeText`.
- `eventLocationText`, `confirmUntilText`, `parkingInfoText`.
- `quickContactText`, `quickContactPhone`, `quickContactSmsMessage`, `quickContactWhatsappMessage`.
- `mapUrl`, `mapDirectionsUrl`, `mapEmbedUrl`.
- `backgroundMusicUrl`, `backgroundMusicVolume`.
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
- Phone input is normalized to digits only before submit.
- Thank-you ticket visibility depends on attendance and digital-ticket feature flag.
