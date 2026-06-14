# Deploying NSR Canvassing (so it works on your phone)

This gets the app onto a real URL with **no firewall** — so Mapbox, Google
Places, **and AccuLynx all work**. Recommended host: **Vercel** (runs the app)
+ **Neon** (the database). Both have free tiers. Total time: ~15 minutes.

You'll need the API keys you already have on hand (Mapbox, Google, AccuLynx,
Cloudinary). They get pasted into Vercel's settings — never into the code.

---

## Step 1 — Put the code somewhere Vercel can see it

The code is on GitHub at `newstandard26/nsr-elite`, on the branch
`claude/github-account-switch-sg7agp`. You can deploy that branch directly —
no need to merge anything first.

## Step 2 — Create the database (Neon)

1. Go to **vercel.com** and sign up (use "Continue with GitHub").
2. Once in, open your project later will need a DB — easiest path: in the
   Vercel dashboard go to the **Storage** tab → **Create Database** →
   **Neon (Postgres)** → follow the prompts (pick a region near Illinois,
   e.g. *US East*).
3. Vercel automatically adds a `DATABASE_URL` environment variable for you.
   ✅ That's the database done — you don't copy anything by hand.

> Prefer Supabase or another Postgres? Fine — just make sure a `DATABASE_URL`
> environment variable ends up set in Step 4.

## Step 3 — Import the app into Vercel

1. In Vercel: **Add New… → Project**.
2. Select the **`nsr-elite`** repository.
3. When it asks which branch / it shows "Production Branch", set it to
   **`claude/github-account-switch-sg7agp`** (Settings → Git after import if
   it's not offered up front).
4. **Don't click Deploy yet** — add the environment variables first (next step).

## Step 4 — Paste in the environment variables

In the import screen (or Project → **Settings → Environment Variables**), add
each of these. Use the values you already have.

| Name | Value |
|------|-------|
| `NEXTAUTH_SECRET` | any long random string — generate one at https://generate-secret.vercel.app/32 |
| `NEXTAUTH_URL` | your Vercel URL, e.g. `https://nsr-elite.vercel.app` (you can fill/fix this after the first deploy gives you the URL) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | your Mapbox `pk.` token |
| `MAPBOX_TOKEN` | same Mapbox `pk.` token |
| `GOOGLE_PLACES_API_KEY` | your Google key |
| `ACCULYNX_API_KEY` | your AccuLynx key |
| `ACCULYNX_BASE_URL` | `https://api.acculynx.com/api/v2` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | your Cloudinary unsigned preset |

`DATABASE_URL` should already be there from Step 2. (Cloudinary lines can be
left out if you're not using photos yet.)

## Step 5 — Deploy

Click **Deploy**. Vercel will:
- install everything,
- **create your database tables** (migrations run automatically),
- **seed the 7 disposition pins + your 8 user accounts** automatically,
- build and publish the app.

When it finishes you get a URL like `https://nsr-elite.vercel.app`.

## Step 6 — First login

Open the URL and sign in:
- **Manager:** `matt@newstandardrestoration.com`
- **Password:** `ChangeMe123!`  ← change this after logging in
- Other reps: `<firstname>@newstandardrestoration.com`, same starting password.

If login complains, double-check `NEXTAUTH_URL` matches your actual Vercel URL,
then redeploy (Vercel → Deployments → ⋯ → Redeploy).

## Step 7 — Put it on your phone

Open the URL in your phone's browser → **Share → Add to Home Screen**. It
installs like a native app (that's the PWA), full-screen, ready for the field.

---

## After it's live

- **AccuLynx:** no firewall in production, so "Create AccuLynx Lead" on a lead
  card will hit the real CRM. If a field mapping needs adjusting, that's a quick
  follow-up once we see a live response.
- **Custom domain** (e.g. `canvass.newstandardrestoration.com`): Vercel →
  Settings → Domains.
- **Auto-deploys:** every push to the production branch redeploys automatically.
