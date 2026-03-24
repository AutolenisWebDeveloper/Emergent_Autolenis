# Supabase ↔ GitHub Integration Guide

This guide walks through linking your Supabase project to the AutoLenis GitHub repository. The integration enables database branching for pull-request previews and automated migration management.

## Prerequisites

- A Supabase project (create one at [supabase.com/dashboard](https://supabase.com/dashboard))
- Repository admin access to `autolenis01/AutoLenis` on GitHub
- Supabase CLI (optional, for migration workflows — can be invoked via `npx supabase` without global install)

## Step 1 — Install the Supabase GitHub Integration

1. Open the [Supabase GitHub Integration](https://github.com/apps/supabase) page.
2. Click **Install** and select the GitHub organization or account that owns the repository.
3. Grant access to the `AutoLenis` repository (or all repositories if preferred).

## Step 2 — Link the Project via Supabase Dashboard

1. Open your Supabase project at `https://supabase.com/dashboard/project/<project-ref>` (replace `<project-ref>` with the ID shown in your Supabase project URL, e.g. `abcdefghijkl`).
2. Navigate to **Project Settings → Integrations → GitHub**.
3. Click **Connect** and authorize Supabase to access the repository.
4. Select the `autolenis01/AutoLenis` repository from the list.
5. Confirm the connection — the dashboard will show a green "Connected" status.

## Step 3 — Enable Database Branching (Optional)

Database branching creates isolated Postgres instances for pull-request previews.

1. In the Supabase Dashboard, go to **Branches**.
2. Enable the branching feature for your project (requires a Pro plan or higher).
3. Once enabled, every pull request that includes migration files under `supabase/migrations/` will automatically spin up a preview database.

> **Note:** AutoLenis currently uses Prisma for schema management (`prisma/schema.prisma`). If you adopt Supabase migrations alongside Prisma, place migration SQL files in `supabase/migrations/` and keep the Prisma schema as the source of truth for application models.

## Step 4 — Configure Environment Secrets

Add the following secrets to your GitHub repository so that CI workflows can communicate with Supabase:

1. Go to **GitHub → Repository Settings → Secrets and variables → Actions**.
2. Add these repository secrets:

| Secret Name | Where to Find |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Supabase Dashboard → Project Settings → Database |
| `SUPABASE_PROJECT_REF` | The ID in your Supabase project URL (e.g. `abcdefghijkl`) |

3. These secrets are used by CI workflows to run migrations and validate schema changes.

## Step 5 — Verify the Connection

After linking, verify everything is working:

1. **Dashboard check** — In Supabase Dashboard → Integrations → GitHub, confirm the repository shows as connected.
2. **Webhook check** — Open a test pull request. If branching is enabled, Supabase will post a status check on the PR.
3. **Local verification** — Install the Supabase CLI and run:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --dry-run
   ```
   A successful dry run confirms the CLI can reach the linked project.

## Unlinking

To remove the integration:

1. Open Supabase Dashboard → Project Settings → Integrations → GitHub.
2. Click **Disconnect**.
3. Optionally, uninstall the Supabase GitHub App from your organization settings.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Repository not listed during linking | Ensure the Supabase GitHub App is installed and has access to the repository. |
| Branch previews not created | Verify the project is on a Pro plan and branching is enabled. |
| CI workflow cannot connect to Supabase | Check that `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` secrets are set correctly. |
| "Permission denied" on link | Ensure you have admin access to both the Supabase project and the GitHub repository. |

## Related Documentation

- [Setup Guide](SETUP.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [RLS Setup](RLS_SETUP.md)
- [Auth Migration Runbook](AUTH_MIGRATION_SUPABASE_RLS_RUNBOOK.md)
- [Prisma → Supabase Migration Status](PRISMA_TO_SUPABASE_MIGRATION_STATUS.md)
