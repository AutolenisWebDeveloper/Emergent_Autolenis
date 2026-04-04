# Webhook Failures Runbook

**Severity**: HIGH
**Domain**: Payments, DocuSign, External Integrations
**Affected System**: Webhook handlers

## Symptoms

- Stripe dashboard shows failed webhook deliveries
- DocuSign Connect logs show delivery errors
- Payment statuses not updating after checkout
- E-sign completion not reflected in deal status
- Health check `WEBHOOK_ENDPOINT` reports FAIL

## Diagnosis Steps

1. Check webhook endpoint health:
   ```
   GET /api/admin/system/health
   ```

2. Review Stripe webhook logs in the Stripe Dashboard → Developers → Webhooks.

3. Review DocuSign Connect logs in DocuSign Admin.

4. Check application logs for signature verification failures (401/400 responses).

5. Verify webhook secrets are configured:
   - `STRIPE_WEBHOOK_SECRET`
   - `DOCUSIGN_CONNECT_SECRET`

## Resolution Steps

1. **Secret mismatch**: Rotate and update the webhook secret in environment config.
2. **Endpoint unreachable**: Verify deployment is healthy. Check Vercel/hosting status.
3. **Signature failure**: Ensure raw body parsing is intact (no middleware interference).
4. **Processing error**: Check for DB constraints or service errors in the handler.
5. **Replay needed**: Use Stripe's "Resend" feature or DocuSign Connect "Retry" to replay failed events.

## Post-Resolution

1. Verify webhooks are being delivered and processed successfully.
2. Reconcile any missed events by replaying from the provider.
3. Verify affected deals/payments have correct states.
4. Update incident record with resolution details.
