# Gedson Silva — personal website

A responsive, engineer-first portfolio built with Next.js App Router, React, TypeScript, and Lucide icons. Includes a homepage, blog index, three full-length editorial starter articles, individual article routes, and a server-side email contact form.

## Run locally

Requires Node.js 20.9+ (Node.js 24 recommended).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. For production: `npm run build && npm start`.

## Enable email delivery (required before launch)

The form uses the Resend API from the server. It does **not** open the visitor’s email application. Messages default to `gedsonmsilva@gmail.com`, from the provided profile.

1. Create a Resend account and verify a sending domain you control.
2. Privately set `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` in `.env.local` or your hosting provider’s environment settings. The sender must use your verified domain. Optionally change `CONTACT_TO_EMAIL`.
3. Restart the app or redeploy after changing the environment.
4. Send a real message from the website and confirm receipt (and Reply-To) in your inbox. Provider acceptance is not a guarantee of inbox delivery; check Resend delivery events and spam if needed.

Do not commit credentials or paste them into chat. Without configuration the server returns 503, the form reports the problem and keeps the draft; it never pretends an email was sent. The visible direct email link remains available.

The API has bounded request streaming, field validation, same-origin checking, a honeypot, and a 10-second provider timeout. It sends plain text to a server-controlled recipient and does not log message contents. For an internet-facing deployment, enable persistent rate limiting / bot protection at your hosting edge or WAF for `/api/contact` (for example, 5 requests per IP per minute). Origin checks and honeypots are not complete spam protection; avoid relying on process-local counters in a multi-instance deployment. Messages are processed by the hosting provider and Resend and retained in the recipient’s mailbox; review those providers’ retention settings and add any jurisdiction-specific privacy disclosures before launch.

## Content and design

- `app/page.tsx`: homepage, experience, contact section.
- `lib/posts.ts`: blog content and metadata; add a unique slug and sections to publish a post.
- `app/blog/[slug]/page.tsx`: article rendering and metadata.
- `app/globals.css`: responsive styles, keyboard focus states, reduced-motion behavior.
- `components/ContactForm.tsx` and `app/api/contact/route.ts`: contact UI and delivery.

Profile details are drawn from `Profile.pdf`; AI positioning reflects the direction in `chatgpt-1`, not a claim of completed AI client projects. The initial articles are editorial starter content for owner review, not dated project case studies. Review these before publishing under your name. No fictional client results or testimonials are used. Fonts are loaded from Google Fonts with local system fallbacks; self-host them if you need offline fonts or to avoid third-party font requests.

## Verification

```sh
npx playwright install chromium  # browser for desktop/mobile acceptance checks
npm test          # permanent acceptance suite, JUnit in test-results/website.xml
npm run build    # production compilation and TypeScript validation
npm run typecheck
```

Tests cover the homepage, article links/content and unknown routes, fixed-recipient delivery through a mocked provider, malformed/oversized inputs, unavailable email configuration, provider/network failures, and form pending/success/retry states. Live inbox delivery needs the private setup above and is not claimed by mocked tests.

## Deployment

Deploy to a Node-capable Next.js host (for example Vercel or a Node.js server), configure the private environment variables, then build. This is not a static-export-only site: `/api/contact` requires a server runtime. Use HTTPS, configure edge abuse protection, and run the real email smoke test before launch. Create a Git remote for backup and deployment; this repository was initialized locally and no remote is configured.
