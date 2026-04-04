# Scraper Outage Runbook

**Severity**: HIGH
**Domain**: Inventory Sourcing
**Affected System**: External inventory scrapers

## Symptoms

- `system_job_runs` shows FAILED status for scraper job keys
- Health check `SCRAPER_STATUS` reports FAIL
- No new canonical inventory listings appearing
- Admin dashboard shows stale inventory counts

## Diagnosis Steps

1. Check recent scraper job runs:
   ```
   GET /api/admin/system/jobs?jobKey=INVENTORY_SCRAPE&limit=10
   ```

2. Review error messages in the `error_message` field of failed runs.

3. Verify the external source is reachable:
   - Check the source URL directly from a browser or `curl`.
   - Check for rate-limit headers (`429 Too Many Requests`).
   - Check for IP blocks or captchas.

4. Check `system_rate_limits` for `SCRAPE_RUNS` — verify the budget has not been exceeded.

## Resolution Steps

1. **Source is down**: Wait for source recovery. Adjust scrape schedule if needed.
2. **Rate-limited**: Reduce scrape frequency in `system_rate_limits`. Lower `max_per_hour` for `SCRAPE_RUNS`.
3. **IP blocked**: Rotate proxy or wait for block expiry.
4. **Parser broken**: Check if the source changed HTML structure. Update parser and redeploy.
5. **Internal error**: Review application logs for stack traces. Fix and redeploy.

## Post-Resolution

1. Update incident status to `RESOLVED` via `PATCH /api/admin/system/incidents`.
2. Trigger a manual catch-up scrape for missed windows.
3. Verify new listings appear in canonical inventory tables.
4. Document root cause in incident payload for post-mortem.
