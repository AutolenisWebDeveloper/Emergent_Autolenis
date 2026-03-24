# Notification Backlog Runbook

**Severity**: MEDIUM
**Domain**: Workflow Automation
**Affected System**: Notification queue

## Symptoms

- `workflow_notification_queue` table has growing count of PENDING notifications
- SLA events firing for INVITE_NO_VIEW or NEW_LEAD_UNTOUCHED
- Buyers/dealers not receiving expected emails or in-app notifications
- Health check `NOTIFICATION_QUEUE` reports WARN or FAIL

## Diagnosis Steps

1. Check queue depth:
   ```sql
   SELECT status, COUNT(*) FROM workflow_notification_queue
   GROUP BY status ORDER BY COUNT(*) DESC;
   ```

2. Check recent notification send job runs:
   ```
   GET /api/admin/system/jobs?jobKey=NOTIFICATION_SEND&limit=10
   ```

3. Verify `NOTIFICATION_SENDS` rate limit hasn't been exceeded.

4. Check Resend API status and delivery logs.

## Resolution Steps

1. **Rate limit hit**: Temporarily increase `max_per_hour` for `NOTIFICATION_SENDS`.
2. **Resend API down**: Wait for Resend recovery. Notifications will retry automatically.
3. **Processing stuck**: Restart the notification cron job. Check for infinite retry loops.
4. **Template error**: Check for invalid template rendering causing per-notification failures.

## Post-Resolution

1. Verify queue is draining normally.
2. Check that previously queued notifications were delivered.
3. Review SLA events to ensure no buyer/dealer workflows are stalled.
4. Update incident record with resolution details.
