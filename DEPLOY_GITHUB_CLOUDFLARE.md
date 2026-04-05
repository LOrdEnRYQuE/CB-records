# GitHub + Cloudflare Deployment Runbook

## 1. Prepare Local Branch

1. Run checks:
```bash
npm run lint
npm run build
```
2. Verify `.env.local` has required values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

## 2. Push To GitHub

1. Commit changes:
```bash
git add .
git commit -m "UI/UX polish pass across public and admin"
```
2. Push branch:
```bash
git push origin <branch-name>
```
3. Open PR and merge to `main` after review.

## 3. Deploy From GitHub

Choose one:

### Option A: Vercel (recommended for this Next.js app)

1. Import GitHub repo in Vercel.
2. Set framework to Next.js.
3. Add production env vars from `.env.local`.
4. Deploy `main`.

### Option B: Cloudflare Workers (advanced)

1. Use OpenNext + Cloudflare adapter workflow.
2. Configure Cloudflare build command and output.
3. Add same production env vars in Cloudflare dashboard.
4. Deploy `main`.

## 4. Connect Domain In Cloudflare

For `cartierubradet.com`:

1. In Cloudflare DNS, point root/apex:
- `A` or `CNAME flattening` to your hosting target.
2. Point `www` CNAME to hosting target.
3. Enable `Proxied` (orange cloud) for CDN/WAF.
4. In hosting provider, add both:
- `cartierubradet.com`
- `www.cartierubradet.com`

## 5. SSL + Cache Rules

1. SSL/TLS mode: `Full (strict)`.
2. Enable automatic HTTPS redirects.
3. Cache static assets aggressively (`/_next/static/*`, images, media).
4. Do not cache authenticated admin pages or API mutations.

## 6. Post-Deploy Smoke Test

1. Public routes:
- `/`
- `/music`
- `/merch`
- `/about`
- `/contact`
2. Auth/admin:
- `/login`
- `/admin/dashboard`
3. Feature checks:
- music player stream/external behavior
- bubble player open/close on multiple pages
- merch filters + buy links
- admin CRUD pages render and save
4. SEO checks:
- `/robots.txt`
- `/sitemap.xml`

## 7. Rollback

1. Keep previous deployment available.
2. If critical regression happens:
- rollback to previous deployment
- log failing route + repro
- patch on a branch and redeploy
