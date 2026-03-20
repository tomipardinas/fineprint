# Fineprint 🔍

> AI reads the Terms of Service before you accept them.

Fineprint is a Chrome extension that automatically detects when you're about to accept Terms of Service or a Privacy Policy — and shows you an AI-powered analysis of what you're agreeing to, before you click Accept.

## What it does

When you land on any page with a ToS checkbox or "Accept" button, Fineprint intercepts it and shows an overlay with:

- 🔒 **Privacy** — data collection, third-party sharing, retention periods
- 🛡️ **Security** — breach liability, data protection clauses
- 🧠 **Behavior** — dark patterns, opt-out defaults, algorithmic influence

Each finding includes the severity (critical / warning / info) and the exact clause from the ToS.

## How it works

```
Page loads → ToS detected → Overlay appears → AI analyzes → You decide
```

The extension calls a serverless backend that fetches the ToS text and sends it to Claude (Anthropic) for analysis. Results are cached for 24 hours per URL.

## Getting started

### Install the extension (dev mode)

1. Clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `extension/` folder
5. Done — Fineprint is active on all pages

### Deploy the backend

1. Import this repo in [Vercel](https://vercel.com)
2. Set root directory to `backend/`
3. Add environment variables:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `STRIPE_SECRET_KEY` — your Stripe secret key (optional for MVP)
4. Deploy

### Use your own Anthropic API key

If you have your own Anthropic API key, you can use it directly (unlimited, no backend needed):

1. Click the Fineprint icon in Chrome
2. Go to **Settings**
3. Paste your API key → unlimited analyses

## Pricing model

| Plan | Analyses | Price |
|------|----------|-------|
| Free | 1 analysis | $0 |
| Pro | Unlimited | $4.99/month |
| BYO Key | Unlimited | Free (your API costs) |

## Project structure

```
fineprint/
├── extension/     # Chrome extension (MV3)
├── backend/       # Vercel serverless API
├── README.md
└── LICENSE
```

## Tech stack

- **Extension:** Vanilla JS, Chrome Manifest V3
- **Backend:** Vercel serverless (Node.js)
- **AI:** Anthropic Claude
- **Payments:** Stripe

## Contributing

PRs welcome. Open an issue first for major changes.

## License

MIT — see [LICENSE](LICENSE)
