# BOLD-Website

Official website for BOLD Beauty Marketing Agency — an AI-powered growth and marketing agency for beauty, aesthetics and wellness businesses.

## Architecture

A single-page, dependency-free static site: plain HTML/CSS/JS, no framework or
build step. This keeps the page light and fast, which matters more here than
tooling convenience since the entire site is one hero + one content panel.

```
index.html            Markup for the whole page
css/styles.css         All styling (design tokens, layout, responsive rules)
css/fonts.css          Self-hosted @font-face declarations
js/main.js              Nav/menu behavior, panel reveal, form handling
js/config.js            Single place to set real links/endpoints (see below)
public/assets/          Images, icons, favicons
public/fonts/           Self-hosted Playfair Display + Jost (Latin subset)
```

Serve the repository root with any static file server (e.g. `npx serve` or
`python3 -m http.server`) — no build step required.

## Fixed background

The beauty photograph is a `position: fixed` layer (`.bg-fixed` in
`index.html`/`styles.css`), not `background-attachment: fixed`, because the
latter is unreliable on mobile Safari. All page content scrolls normally in
front of it.

## Configuration points (`js/config.js`)

Three values are intentionally left unset because they aren't verified
anywhere in this repository — the UI is fully built, but nothing invented:

- `instagramUrl` — BOLD's Instagram profile URL. Until set, the Instagram
  links render inert (`aria-disabled`) rather than pointing somewhere wrong.
- `email` — BOLD's business email. Until set, the Email links behave the same way.
- `enquiryEndpoint` — where the enquiry form POSTs its JSON payload. No
  backend is configured yet, so submitting the form currently shows an honest
  "not yet connected" message rather than a fake success state. Point this at
  BOLD's Lead Engine / AI Inbox / CRM endpoint when it exists; no UI changes
  are needed.

## Fonts

Self-hosted, Latin-subset-only `.woff2` files for Playfair Display (editorial
serif — headings, italic emphasis) and Jost (refined sans — nav, labels,
body). Only the weights actually used in `styles.css` are included, and
fonts are self-hosted rather than loaded from Google Fonts at runtime so the
site has no third-party dependency.
