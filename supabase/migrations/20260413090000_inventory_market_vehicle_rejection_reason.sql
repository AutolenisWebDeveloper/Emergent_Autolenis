ALTER TABLE public."InventoryMarketVehicle"
  ADD COLUMN IF NOT EXISTS "rejectionReason" text;
