# Leonor Birthday Invitation

Single-page web invitation for Leonor's first birthday, with RSVP submission and themed visuals.

## Features

- Animated hero section with Minnie art (loaded from `minnie-art.html`)
- Live countdown to the event date
- Background music with user-gesture fallback for browser autoplay policies
- RSVP form with validation (name, phone, attendance, message)
- RSVP delivery to email through Formspree
- Embedded Google Maps location

## Project Structure

- `index.html`: main page markup (default entry)
- `convite.css`: styles, layout, and animations
- `convite.js`: config, countdown logic, audio handling, and RSVP submit logic
- `minnie-art.html`: decorative Minnie-style artwork rendered in an iframe
- `audio.mp3`: background music file
- `favicon.svg`: site icon

## Run Locally

1. Open a terminal in the project folder.
2. Start a local static server:

```bash
python -m http.server 8080
```

3. Open this URL in your browser:

```text
http://localhost:8080/
```

You can also open `index.html` directly, but form and media behavior is usually more reliable through a local server.

## Configuration

Most editable values live in the `INVITE_CONFIG` object at the top of `convite.js`.

Common values to update:

- `title`, `heroSubtitle`
- `eventDateISO`, `eventDateText`, `eventTimeText`
- `eventLocationText`, `confirmUntilText`, `eventTimezone`
- `mapUrl`, `mapEmbedUrl`
- `backgroundMusicUrl`, `backgroundMusicVolume`
- `emailService.endpoint`, `emailService.enabled`

## RSVP Email Setup (Formspree)

1. Create a Formspree form endpoint.
2. Set `INVITE_CONFIG.emailService.endpoint` to your endpoint URL.
3. Keep `INVITE_CONFIG.emailService.enabled` as `true`.
4. Submit a test RSVP from the page.

## Deployment

This is a static website and can be deployed to platforms such as Netlify or GitHub Pages.

## Notes

- First-visit loader state is stored in localStorage using `leonor_invite_first_visit_loader_v1`.
- Phone input is restricted to digits only.
- Guest count is validated between 1 and 20.
