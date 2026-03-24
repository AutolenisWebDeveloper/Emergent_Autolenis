-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dealer Applications Table (for tracking pending approvals)
CREATE TABLE IF NOT EXISTS dealer_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id TEXT NOT NULL REFERENCES "Dealer"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  business_type TEXT,
  years_in_business TEXT,
  average_inventory TEXT,
  monthly_volume TEXT,
  website TEXT,
  additional_info TEXT,
  reviewed_by TEXT REFERENCES "User"(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_dealer_applications_status ON dealer_applications(status);
CREATE INDEX IF NOT EXISTS idx_dealer_applications_dealer ON dealer_applications(dealer_id);
