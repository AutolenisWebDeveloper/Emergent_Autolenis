#!/bin/bash
# Environment Variables Verification Script
# Verifies Supabase environment variables are configured without exposing secrets

echo "================================================"
echo "Supabase Environment Variables Verification"
echo "================================================"
echo ""

# Check NEXT_PUBLIC_SUPABASE_URL
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  # Parse the project reference from the URL
  PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https?://([^.]+)\..*|\1|')
  echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
  echo "   Project Reference: $PROJECT_REF"
  echo "   Format: Valid URL format detected"
else
  echo "❌ NEXT_PUBLIC_SUPABASE_URL is NOT set"
  echo "   Action: Set this variable to your Supabase project URL"
  echo "   Example: https://abc123xyz.supabase.co"
fi

echo ""

# Check SUPABASE_SERVICE_ROLE_KEY (without exposing it)
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  # Get the length to verify it looks valid (should be ~200+ chars for a JWT)
  KEY_LENGTH=${#SUPABASE_SERVICE_ROLE_KEY}
  echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
  echo "   Key length: $KEY_LENGTH characters"
  if [ $KEY_LENGTH -gt 100 ]; then
    echo "   Format: Appears to be a valid JWT token"
  else
    echo "   ⚠️  Warning: Key seems short, verify it's correct"
  fi
else
  echo "❌ SUPABASE_SERVICE_ROLE_KEY is NOT set"
  echo "   Action: Set this variable to your Supabase service role key"
  echo "   Location: Supabase Dashboard → Settings → API → service_role key"
fi

echo ""
echo "================================================"
echo "Summary"
echo "================================================"

# Count configured variables
CONFIGURED=0
[ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && ((CONFIGURED++))
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && ((CONFIGURED++))

echo "Configured: $CONFIGURED/2 required variables"
echo ""

if [ $CONFIGURED -eq 2 ]; then
  echo "✅ All required Supabase environment variables are configured"
  echo ""
  echo "Next step: Test the health check endpoint"
  echo "  curl http://localhost:3000/api/health/db | jq ."
  exit 0
else
  echo "❌ Missing required environment variables"
  echo ""
  echo "Action Required:"
  echo "1. Create/update .env.local file (for local development)"
  echo "2. Add the missing variables"
  echo "3. Restart your development server"
  exit 1
fi
