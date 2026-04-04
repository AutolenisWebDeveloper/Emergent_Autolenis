# AutoLenis Release Checklist

Use this lightweight checklist before cutting a release to keep preview and production stable.

- [ ] Ensure `pnpm install --frozen-lockfile` succeeds and lockfile is committed.
- [ ] Run `pnpm build` on a clean workspace; record any warnings or errors.
- [ ] Verify environment variables are set for Supabase, Stripe, email, and NextAuth in Vercel.
- [ ] Confirm database migrations are applied and Prisma client is regenerated.
- [ ] Smoke-test critical journeys (buyer, dealer, affiliate, admin) in preview.
- [ ] Check new routes have loading/error states and protected routes redirect appropriately.
- [ ] Rotate any temporary secrets or tokens used during testing.
- [ ] Update changelog/PR description with known issues and verification steps.
