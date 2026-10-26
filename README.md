<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a363dfcc-e60e-498a-8294-3d9c61acf1c1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm ci`
2. (Optional) Copy [.env.example](.env.example) to `.env.local` and set the frontend Supabase URL and publishable/anon key.
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

1. Push this project to the `main` branch of a GitHub repository.
2. In **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and deploys the site on pushes to `main`; it can also be run manually from the Actions tab.
4. Vite derives the Pages base path from GitHub Actions' repository name. Local development and preview continue to use `/`.

The app can be configured with a Supabase project URL and publishable/anon key in its Settings page. These values are public in a browser application; never use a Supabase `service_role` key. Before making this admin app publicly accessible, verify that Supabase table and Storage policies restrict access to authorized users. The current SQL schema grants broad access to `anon` and `public`, so its RLS policies are not suitable for a public production deployment as-is.

## Supabase roster migration

For existing Supabase projects, run `supabase/migration_add_player_sleeve.sql` once in the Supabase SQL Editor to enable per-player sleeve overrides. New databases created from `supabase/schema.sql` already include this field.
