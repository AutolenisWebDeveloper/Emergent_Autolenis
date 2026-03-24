# AutoLenis Deployment Checklist

Use this checklist before deploying to production to ensure all systems are operational and secure.

## Pre-Deployment

### Environment Variables
- [ ] All required environment variables are set in Vercel project settings
- [ ] `JWT_SECRET` is a strong, randomly generated string (min 32 characters)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for server-side operations)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set (for client-side operations)
- [ ] `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are production keys
- [ ] `STRIPE_WEBHOOK_SECRET` is configured for production webhooks
- [ ] Email provider key is set (`RESEND_API_KEY`)
- [ ] `NEXT_PUBLIC_APP_URL` points to production domain
- [ ] `CRON_SECRET` is set for scheduled jobs
- [ ] `ADMIN_BOOTSTRAP_SECRET` is set to restrict admin signups (remove after first admin is created)

### Database
- [ ] Database migrations have been run successfully
- [ ] RLS (Row Level Security) policies are enabled on all tables
- [ ] Database connection pooling is configured
- [ ] Backup strategy is in place
- [ ] Database credentials are rotated and secure
- [ ] Supabase project is linked to GitHub repository (see [Supabase GitHub Integration](SUPABASE_GITHUB_INTEGRATION.md))

### Security
- [ ] CORS headers are properly configured
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Content Security Policy headers are set
- [ ] All API routes validate input with Zod schemas
- [ ] No sensitive data is logged
- [ ] Error messages don't expose internal details
- [ ] HTTPS is enforced

### Code Quality
- [ ] TypeScript build passes without errors: `npm run typecheck`
- [ ] All tests pass: `npm run test`
- [ ] No console.log statements remain in production code
- [ ] Bundle size is analyzed: `npm run analyze`
- [ ] Unused imports are removed

### Monitoring
- [ ] Error monitoring is configured (Sentry DSN set if using)
- [ ] Performance monitoring is enabled
- [ ] Health check endpoint `/api/health` is accessible
- [ ] Log aggregation is set up
- [ ] Alerts are configured for critical errors

### Testing
- [ ] Manual testing completed on staging environment
- [ ] Authentication flows tested (signup, signin, password reset)
- [ ] Payment flows tested with Stripe test mode
- [ ] Email delivery tested
- [ ] Mobile responsive design verified on real devices
- [ ] Cross-browser testing completed (Chrome, Safari, Firefox)

### Performance
- [ ] Lighthouse score > 90 for performance
- [ ] Core Web Vitals are in "Good" range
- [ ] Images are optimized and use Next.js Image component
- [ ] Caching headers are configured
- [ ] Database queries are optimized

## Deployment

### Build
- [ ] Production build completes successfully: `npm run build`
- [ ] No build warnings
- [ ] Bundle size is acceptable (< 1MB main bundle)

### Deploy
- [ ] Deploy to Vercel production environment
- [ ] Verify deployment URL is accessible
- [ ] Check all environment variables are loaded
- [ ] Verify database connection works

## Post-Deployment

### Verification
- [ ] Homepage loads correctly
- [ ] User can sign up and sign in
- [ ] Dealer registration works
- [ ] Admin panel is accessible (with correct credentials)
- [ ] Payment processing works
- [ ] Email notifications are sent
- [ ] Webhooks are received (Stripe, eSign)

### Monitoring
- [ ] Check error monitoring dashboard for issues
- [ ] Verify logs are being captured
- [ ] Monitor API response times
- [ ] Check for any 5xx errors

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Previous deployment version is available
- [ ] Database backup is accessible
- [ ] Team knows how to revert changes

## Weekly Maintenance

- [ ] Review error logs for patterns
- [ ] Check database performance metrics
- [ ] Review security alerts
- [ ] Update dependencies if needed
- [ ] Rotate API keys on schedule

## Emergency Contacts

- **Technical Lead**: [Add contact]
- **Database Admin**: [Add contact]
- **DevOps**: [Add contact]
- **On-Call Rotation**: [Add schedule]

## Rollback Procedure

1. Access Vercel dashboard
2. Navigate to Deployments
3. Find previous stable deployment
4. Click "Promote to Production"
5. Verify rollback successful
6. Notify team
7. Investigate issue in separate environment
