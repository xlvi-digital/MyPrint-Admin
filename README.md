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

## Import roster

The roster form accepts `.csv` and `.xlsx` files with the required headers `Nama`, `No Punggung`, and `Ukuran`; `Qty`, `Catatan`, and `Jenis Lengan` are optional. The import preview can be edited before applying, appends by default, and has an explicit confirmation before replacing the current roster. The Excel template is available from the import modal. Keep jersey numbers stored as text in spreadsheets, or use a zero-padded number format such as `00`, so leading zeroes are preserved.

The WhatsApp paste modal also accepts slash-separated rows such as `Apriana/4/L`; rows that need review remain editable. Run `npm run test` for roster parser/import tests.

## Order channels and master data

For an existing project that has not installed atomic yearly order numbering, first run `supabase/migration_atomic_order_numbers.sql`. This migration is already part of the current `supabase/schema.sql`.

After the existing schema is installed, run `supabase/migration_order_channels_and_master_data.sql` in the Supabase SQL Editor. It adds `sales_channel` and `external_order_number` without changing the internal `orders.order_number`, creates the four master tables, seeds them from existing text values, and adds nullable foreign-key IDs while keeping the legacy text columns intact. Old orders default to `Offline`; their external number remains empty until entered.

Order forms continue to read the legacy material, product, size, and collar text fields, and saves also persist master IDs when the value matches a master record. The migration does not rewrite existing order or roster rows; their nullable ID references are filled as those records are next saved. This allows historical/custom values to remain readable even when no master ID exists.

Next, run `supabase/migration_secure_master_and_order_designs.sql`. It restricts the four master tables, orders, roster rows, collar/printing rows, profiles, activity logs, and order-design metadata to authenticated owner/admin accounts. It also creates the private `order-designs-private` bucket for new design uploads. Existing rows and internal order numbers are preserved. Legacy collar-reference image URLs remain publicly readable for compatibility, but uploads/updates/deletes require an owner/admin account.

After those migrations, run `supabase/migration_offline_order_numbers.sql` and `supabase/migration_order_optional_feature_flags.sql` in the Supabase SQL Editor. The first enables atomic monthly `MPCJR-MMYY-NNNN` numbers for new Offline orders while leaving other sales channels on the existing yearly generator. The second stores optional-feature activation flags and infers their initial values from existing order data. Both migrations are included in `supabase/schema.sql` for new databases.

Configure Supabase Auth before deploying:

1. Enable Email/Password sign-in in Supabase Auth. Create or invite the initial owner using the Supabase Dashboard; disable public sign-ups if they are not needed.
2. Set the first user's server-managed role from a trusted Supabase administrative workflow (for example, SQL Editor):
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
   WHERE email = 'owner@example.com';
   ```
   Replace the email with the exact account email. Have the user sign out and back in so the JWT includes the updated claim. Use `{"role":"admin"}` for subsequent administrators. Never place a `service_role` key in the browser or grant roles from user-editable metadata/local profile settings.
3. Configure the app with the Supabase project URL and publishable/anon key using the Settings page or deployment environment. The login page is required when Supabase is configured; without Supabase, the app retains its existing local/offline mode.

After the security migration, master data is readable to signed-in users; order and production data is readable/writable only to owner/admin accounts. New designs use private Storage. Previously uploaded images in the public `collar-references` and `order-designs` buckets remain publicly readable because existing order records may store public URLs. Frontend login is not a substitute for RLS.

## Validation and deployment

Run `npm run test`, `npm run lint`, and `npm run build` locally. In Supabase, apply the schema/migrations in order, then verify: anonymous master reads/writes are denied; an authenticated user without an `owner`/`admin` claim cannot change master data or access private designs; an owner/admin can CRUD master data and upload/replace/remove a design; and order, roster, and invoice data still load after refresh. Finally, push to `main` and verify the GitHub Actions Pages deployment in the repository's **Actions** tab. Supabase migrations must be run separately in the Supabase SQL Editor; GitHub Pages does not apply them.
