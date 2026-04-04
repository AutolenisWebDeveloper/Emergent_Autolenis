# Source Degradation Runbook

**Severity**: MEDIUM
**Domain**: Inventory Sourcing
**Affected System**: External data feeds

## Symptoms

- Scraper jobs succeed but yield fewer results than expected
- Inventory listings have missing or stale fields (price, mileage, photos)
- Health check `SOURCE_QUALITY` reports WARN
- Canonical vehicle deduplication shows increased duplicates

## Diagnosis Steps

1. Compare recent scrape output volumes against historical baselines.
2. Check specific source payload quality in `system_job_runs` payload field.
3. Verify source API/page structure hasn't changed.
4. Check normalization service logs for increased error rates.

## Resolution Steps

1. **Partial data**: Adjust parser to handle missing optional fields gracefully.
2. **Stale data**: Flag affected listings with a `data_quality` warning.
3. **Schema change**: Update scraper/parser to match new source format.
4. **Source deprecated**: Remove source from scrape configuration and notify admin.

## Post-Resolution

1. Re-scrape affected sources with updated configuration.
2. Run deduplication pass on recent inventory.
3. Update incident record with root cause.
