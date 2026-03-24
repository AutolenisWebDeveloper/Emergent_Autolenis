#!/bin/bash

# Fix app/api/auth/diagnostics/route.ts
sed -i "s/envCheck\.hasJwtSecret/envCheck['hasJwtSecret']/g" app/api/auth/diagnostics/route.ts
sed -i "s/envCheck\.jwtSecretLength/envCheck['jwtSecretLength']/g" app/api/auth/diagnostics/route.ts
sed -i "s/envCheck\.hasSupabaseUrl/envCheck['hasSupabaseUrl']/g" app/api/auth/diagnostics/route.ts
sed -i "s/envCheck\.hasSupabaseServiceKey/envCheck['hasSupabaseServiceKey']/g" app/api/auth/diagnostics/route.ts
sed -i "s/envCheck\.appUrl/envCheck['appUrl']/g" app/api/auth/diagnostics/route.ts

# Fix app/api/health/route.ts
sed -i "s/npm_package_version/npm_package_version/g" app/api/health/route.ts

# Fix app/buyer/auction/[id]/offers/page.tsx
sed -i "s/OfferType\.BALANCED/OfferType['BALANCED']/g" app/buyer/auction/[id]/offers/page.tsx

# Fix app/buyer/pickup/[dealId]/page.tsx
sed -i "s/params\.dealId/params['dealId']/g" app/buyer/pickup/[dealId]/page.tsx

# Fix app/buyer/sign/[dealId]/page.tsx
sed -i "s/params\.dealId/params['dealId']/g" app/buyer/sign/[dealId]/page.tsx

# Fix app/dealer/auctions/[id]/page.tsx
sed -i "s/params\.id/params['id']/g" app/dealer/auctions/[id]/page.tsx

# Fix app/dealer/contracts/[id]/page.tsx
sed -i "s/SignatureFieldType\.INFO/SignatureFieldType['INFO']/g" app/dealer/contracts/[id]/page.tsx

# Fix app/ref/[code]/page.tsx
sed -i "s/params\.code/params['code']/g" app/ref/[code]/page.tsx

echo "Batch fixes applied"
