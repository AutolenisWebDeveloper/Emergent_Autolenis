# Dealer Invite Failures Runbook

**Severity**: MEDIUM
**Domain**: Dealer Onboarding
**Affected System**: Dealer invite/agreement service

## Symptoms

- Dealers report not receiving invitation emails
- `dealer_portal_invites` table shows PENDING invites beyond expected timeframe
- SLA events for `INVITE_NO_VIEW` or `INVITE_EXPIRE` firing
- Resend delivery logs show bounces or failures

## Diagnosis Steps

1. Check recent invite send attempts in application logs.

2. Verify Resend API key is valid and email service is operational.

3. Check `EmailSendLog` for the dealer's email address:
   ```sql
   SELECT * FROM "EmailSendLog"
   WHERE recipient = 'dealer@example.com'
   ORDER BY created_at DESC LIMIT 5;
   ```

4. Verify the invite record exists and has correct status:
   ```sql
   SELECT * FROM dealer_portal_invites
   WHERE dealer_id = '<id>'
   ORDER BY created_at DESC LIMIT 1;
   ```

5. Check for email domain blocks, SPF/DKIM failures in Resend dashboard.

## Resolution Steps

1. **Email bounced**: Verify dealer email is correct. Contact dealer for updated email.
2. **Resend API error**: Check API key validity. Rotate if compromised.
3. **Template error**: Verify invite email template renders correctly.
4. **Invite expired**: Create a new invite and resend.
5. **Rate limited**: Check `NOTIFICATION_SENDS` rate limit. Adjust if needed.

## Post-Resolution

1. Verify dealer received the invite email.
2. Verify invite link works and leads to the correct onboarding flow.
3. Update incident record with resolution details.
