# Alxora Web

Alxora is a Next.js storefront and admin dashboard for catalog, checkout, vendor onboarding, media management, and customer account flows.

## Stack

- Next.js 15
- React 19
- Supabase auth + database
- Cloudflare R2 for media storage
- Paystack for payments
- Resend for transactional email

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill all required values in `.env.local`.

4. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Required Environment Variables

Minimum production variables:

- `NEXT_PUBLIC_SITE_URL`
- `APP_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPER_ADMIN_EMAIL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

Optional integrations:

- `ALGOLIA_APP_ID`
- `ALGOLIA_SEARCH_API_KEY`
- `ALGOLIA_INDEX_NAME`
- `EXCHANGE_RATE_API_KEY`
- `NEXT_PUBLIC_CHAT_API_URL`
- `NEXT_PUBLIC_BG_REMOVAL_API_URL`

## Database and Content

Apply your Supabase SQL migrations before production deploy. This repo stores SQL under `supabase/sql/`.

Typical sequence:

```bash
# apply new SQL in Supabase SQL editor or your migration flow
# then verify the app against the updated schema
npm run build
```

## Production Run

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

Health check:

```bash
curl https://your-domain.com/api/health
```

## Production Checklist

- All required env vars are present in production.
- Supabase schema is current.
- R2 bucket credentials and public base URL are valid.
- Paystack live keys are configured.
- Resend sending domain is verified.
- `NEXT_PUBLIC_SITE_URL` and `APP_BASE_URL` match the deployed domain.
- `R2_PUBLIC_BASE_URL` and `R2_VIDEO_PUBLIC_BASE_URL` point to `https://media.alxora.com` if you are serving media through the custom domain.
- Admin-only external tools are explicitly configured if used:
  - `NEXT_PUBLIC_CHAT_API_URL`
  - `NEXT_PUBLIC_BG_REMOVAL_API_URL`
- `npm run build` passes before deploy.
- `/api/health`, `/robots.txt`, and `/sitemap.xml` respond correctly.

## Security Defaults In This Repo

- Zod validation on API inputs.
- Shared text sanitization for user-submitted text fields.
- Basic per-IP rate limiting on auth and public write endpoints.
- Secure response headers in `next.config.js`.
- No localhost fallback URLs for production-only admin tooling.

## Notes

- The in-memory rate limiter is suitable for a single-node deployment baseline. For multi-instance or edge-heavy production, move rate limiting to shared infrastructure such as Redis, Cloudflare, or your gateway.
- The admin AI assistant and background-removal tools require their external service URLs to be configured explicitly.
