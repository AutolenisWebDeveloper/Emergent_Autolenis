-- System 3: Vehicle Inventory & Data Normalization
-- Additive schema changes only - DO NOT drop existing tables

-- Add missing columns to Vehicle table
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS doors INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS msrp_cents INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS options_json JSONB;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS images_json JSONB;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS body_style TEXT;

-- Add missing columns to InventoryItem table
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS vin TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'MANUAL';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS source_reference_id TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS exterior_color_override TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS interior_color_override TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS photos_json JSONB;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_make_model_year ON "Vehicle" (make, model, year);
CREATE INDEX IF NOT EXISTS idx_vehicle_vin ON "Vehicle" (vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_dealer_status ON "InventoryItem" ("dealerId", status);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON "InventoryItem" (status);
CREATE INDEX IF NOT EXISTS idx_inventory_price ON "InventoryItem" ("priceCents");
CREATE INDEX IF NOT EXISTS idx_inventory_vin ON "InventoryItem" (vin) WHERE vin IS NOT NULL;

-- Create vehicle_makes lookup table (optional but helpful for normalization)
CREATE TABLE IF NOT EXISTS vehicle_makes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create vehicle_models lookup table
CREATE TABLE IF NOT EXISTS vehicle_models (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  make_id TEXT REFERENCES vehicle_makes(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(make_id, normalized_name)
);

-- Create inventory_import_jobs table for tracking CSV imports
CREATE TABLE IF NOT EXISTS inventory_import_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id TEXT NOT NULL REFERENCES "Dealer"(id),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  total_rows INTEGER DEFAULT 0,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  errors_json JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed common vehicle makes
INSERT INTO vehicle_makes (name, normalized_name) VALUES
  ('Toyota', 'TOYOTA'),
  ('Honda', 'HONDA'),
  ('Ford', 'FORD'),
  ('Chevrolet', 'CHEVROLET'),
  ('BMW', 'BMW'),
  ('Mercedes-Benz', 'MERCEDES-BENZ'),
  ('Audi', 'AUDI'),
  ('Lexus', 'LEXUS'),
  ('Nissan', 'NISSAN'),
  ('Hyundai', 'HYUNDAI'),
  ('Kia', 'KIA'),
  ('Volkswagen', 'VOLKSWAGEN'),
  ('Subaru', 'SUBARU'),
  ('Mazda', 'MAZDA'),
  ('Jeep', 'JEEP'),
  ('Ram', 'RAM'),
  ('GMC', 'GMC'),
  ('Dodge', 'DODGE'),
  ('Chrysler', 'CHRYSLER'),
  ('Acura', 'ACURA'),
  ('Infiniti', 'INFINITI'),
  ('Volvo', 'VOLVO'),
  ('Porsche', 'PORSCHE'),
  ('Land Rover', 'LAND ROVER'),
  ('Jaguar', 'JAGUAR'),
  ('Tesla', 'TESLA'),
  ('Rivian', 'RIVIAN'),
  ('Lucid', 'LUCID')
ON CONFLICT (name) DO NOTHING;
