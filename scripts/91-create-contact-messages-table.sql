-- Create contact_messages table for storing contact form submissions
-- This provides a backup and tracking mechanism alongside email notifications

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_messages') THEN
    CREATE TABLE contact_messages (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP,
      notes TEXT
    );
    
    -- Index for filtering by status and date
    CREATE INDEX idx_contact_messages_status ON contact_messages(status);
    CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
  END IF;
END $$;
