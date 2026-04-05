# Release Checklist

## 1. Pre-Deploy (Local)

1. Confirm environment variables are set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (recommended for canonical sitemap/robots host)

2. Run quality gates:
```bash
npm run lint
npm run build
```

3. Confirm Supabase migrations are applied:
- `supabase/migrations/202604040003_merch_products.sql`
- `supabase/migrations/202604040004_user_role_bootstrap.sql`
- `supabase/migrations/202604050005_track_likes.sql`

4. Confirm admin bootstrap user has role:
- `cartierubradet@gmail.com` should have admin access.

## 2. Core Functional QA

1. Public routes:
- `/`
- `/music`
- `/music/[slug]` (at least one published album)
- `/merch`
- `/merch/[slug]` (at least one published product)
- `/about`
- `/contact`

2. Auth/admin:
- Login at `/login`
- Access `/admin/dashboard`
- Confirm protected routes redirect when unauthenticated.

3. Admin modules:
- `/admin/albums` create/edit/publish/delete
- `/admin/tracks` create/import/share-import/delete
- `/admin/media` upload/edit/delete
- `/admin/merch` create/edit/publish/delete
- `/admin/settings` create/edit/delete
- `/admin/audit` entries appear after mutating actions

4. Player and social behavior:
- Main player: play/pause/next/prev, queue, source tabs
- Bubble player appears on all pages and opens/closes correctly
- Likes sync to backend (`/api/track-likes`)
- Comments add/edit/delete in catalog/player/bubble/comments drawer
- Share actions copy links

## 3. Mobile & Accessibility QA

1. Mobile header menu:
- Opens/closes
- Closes on link click
- Closes on outside click and `Escape`

2. Floating panels:
- Bubble player and comments drawer trap focus when open
- `Escape` closes panels
- Focus returns to trigger button on close

3. Empty states:
- Verify clear empty states on music, merch, and admin list views.

## 4. SEO & Indexing QA

1. Metadata:
- Verify page title/description on `/`, `/music`, `/about`, `/contact`, `/merch`.

2. Robots and sitemap:
- `/robots.txt` loads and disallows `/admin/` and `/api/`
- `/sitemap.xml` loads and contains dynamic music/merch URLs

3. Open Graph:
- Validate preview images/titles for key routes.

## 5. Deploy

1. Deploy to Vercel (production).
2. Confirm build logs show successful compile and route generation.
3. Re-run quick smoke test on production for:
- login
- admin dashboard
- music player stream/external
- merch filters and buy links
- sitemap/robots URLs

## 6. Rollback Readiness

1. Keep previous production deployment available in Vercel.
2. If critical regression occurs:
- rollback immediately
- capture failing route, user impact, and repro steps
- patch on branch and redeploy.
