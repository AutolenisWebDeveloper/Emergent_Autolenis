-- SEO Pages metadata table
CREATE TABLE IF NOT EXISTS seo_pages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_key TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT,
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  robots_rule TEXT DEFAULT 'index, follow',
  indexable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SEO Structured data table
CREATE TABLE IF NOT EXISTS seo_schema (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_key TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_key, schema_type)
);

-- SEO Health monitoring table
CREATE TABLE IF NOT EXISTS seo_health (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_key TEXT UNIQUE NOT NULL,
  score INTEGER DEFAULT 0,
  issues_json JSONB DEFAULT '[]'::jsonb,
  last_scan_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEO Keywords tracking table
CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_key TEXT UNIQUE NOT NULL,
  primary_keyword TEXT,
  secondary_keywords JSONB DEFAULT '[]'::jsonb,
  target_density DECIMAL DEFAULT 2.5,
  actual_density DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default SEO data for main pages
INSERT INTO seo_pages (page_key, title, description, keywords, og_title, og_description, og_image_url) VALUES
('home', 'AutoLenis — Car Buying. Reengineered.', 'Get pre-qualified instantly, let dealers compete for your business, and drive away with the best deal. Save thousands with AutoLenis transparent car buying process.', 'car buying, pre-qualification, dealer auction, best car prices, transparent car shopping', 'AutoLenis — Car Buying. Reengineered.', 'Join thousands who saved with our transparent car buying platform. Pre-qualification in 5 minutes, dealers compete, you save.', '/og-home.jpg'),
('how-it-works', 'How AutoLenis Works | Step-by-Step Car Buying Process', 'Discover our simple 4-step car buying process: Get pre-qualified, browse inventory, let dealers compete, and drive away with confidence.', 'how to buy a car, car buying process, dealer auction, auto financing', 'How the AutoLenis Car Buying Process Works', 'Simple, transparent, and designed to save you money. See how our process works.', '/og-how-it-works.jpg'),
('pricing', 'AutoLenis Pricing & Fees | Transparent Concierge Service', 'Simple, transparent pricing. Only $499 for vehicles under $35k, $750 for vehicles over. No hidden fees, no surprises.', 'car buying fees, concierge service pricing, transparent fees', 'Transparent Pricing - AutoLenis', 'Simple concierge fees. No hidden charges. Save thousands on your car purchase.', '/og-pricing.jpg'),
('about', 'About AutoLenis | Our Mission to Transform Car Buying', 'Learn about AutoLenis mission to bring transparency and fairness to car buying. Meet our team and discover why we built this platform.', 'about autolenis, car buying revolution, transparent car shopping', 'About AutoLenis - Revolutionizing Car Buying', 'We are changing the way people buy cars for the better.', '/og-about.jpg'),
('contact', 'Contact AutoLenis | Get Help & Support', 'Have questions? Our team is here to help. Reach out via email, phone, or chat for assistance with your car buying journey.', 'contact autolenis, customer support, car buying help', 'Contact Us - AutoLenis Support', 'Get in touch with our support team for any questions about your car purchase.', '/og-contact.jpg'),
('faq', 'FAQ - Frequently Asked Questions | AutoLenis', 'Find answers to common questions about pre-qualification, auctions, fees, financing, insurance, and more.', 'autolenis faq, car buying questions, auction faq', 'Frequently Asked Questions - AutoLenis', 'Get answers to your questions about our car buying platform.', '/og-faq.jpg')
ON CONFLICT (page_key) DO NOTHING;
