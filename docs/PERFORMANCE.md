# Performance Optimization Guide

## Caching Strategy

### Simple In-Memory Cache
We've implemented a simple in-memory cache for frequently accessed data:

\`\`\`typescript
import { cache } from '@/lib/cache/simple-cache'

// Set cache with 5 minute TTL
cache.set('user-123', userData, 5 * 60 * 1000)

// Get from cache
const data = cache.get('user-123')
\`\`\`

**When to use:**
- Frequently accessed static/semi-static data
- Data that doesn't change often (dealer lists, vehicle specs)
- SEO metadata
- Affiliate referral codes

**When NOT to use:**
- User-specific sensitive data
- Real-time auction data
- Payment information
- Anything requiring strict consistency

### Database Query Optimization

All service methods have been optimized to:
1. Select only needed columns (no `select("*")`)
2. Use appropriate indexes
3. Limit result sets
4. Order efficiently

**Example:**
\`\`\`typescript
// ❌ Bad - fetches all columns
await supabase.from("User").select("*").eq("id", userId)

// ✅ Good - only needed columns
await supabase.from("User").select("email, firstName, lastName").eq("id", userId)
\`\`\`

## Referral Code Standardization

All referral code logic now uses the `refCode` field as primary with backwards compatibility:

\`\`\`typescript
import { getReferralCode, buildReferralLink } from '@/lib/utils/referral-code'

// Get code from affiliate (handles all field variants)
const code = getReferralCode(affiliate)

// Build referral link
const link = buildReferralLink(code, '/get-started')
\`\`\`

## Production Recommendations

For production deployments at scale:

1. **Add Redis for caching** - Replace simple-cache with Redis
2. **Implement CDN** - Cache static assets and images
3. **Database connection pooling** - Use Supabase pooling or PgBouncer
4. **Enable Vercel Edge Caching** - For API routes where appropriate
5. **Add database indexes** - On frequently queried columns

## Monitoring

Track these metrics:
- API response times (p50, p95, p99)
- Database query times
- Cache hit/miss rates
- Memory usage
