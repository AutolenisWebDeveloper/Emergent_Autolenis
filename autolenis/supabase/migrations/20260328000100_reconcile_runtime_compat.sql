DO $$
BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.buyer_qualification_active AS
    SELECT DISTINCT ON ("buyerId")
      "id",
      "buyerId" AS buyer_id,
      "status",
      "maxOtdAmountCents" AS max_otd_amount_cents,
      "maxMonthlyPaymentCents" AS max_monthly_payment_cents,
      "createdAt" AS created_at,
      "updatedAt" AS updated_at
    FROM public."PreQualification"
    ORDER BY "buyerId", "createdAt" DESC';

  EXECUTE 'CREATE OR REPLACE VIEW public."VehicleRequestCase" AS
    SELECT
      id::text AS "id",
      status AS "status",
      vehicle_location_zip AS "marketZip",
      created_at::timestamp without time zone AS "createdAt",
      buyer_id AS "buyerId"
    FROM public.car_requests';

  ALTER TABLE public."AuctionOffer" ADD COLUMN IF NOT EXISTS "status" text;

  ALTER TABLE public."SelectedDeal" ADD COLUMN IF NOT EXISTS "total_otd_amount_cents" bigint;
  ALTER TABLE public."SelectedDeal" ADD COLUMN IF NOT EXISTS "insurance_readiness_status" text;
  ALTER TABLE public."SelectedDeal" ADD COLUMN IF NOT EXISTS "delivery_block_flag" boolean;

  ALTER TABLE public."Affiliate" ADD COLUMN IF NOT EXISTS "status" text;

  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "priceCents" bigint;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "year" integer;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "make" text;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "model" text;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "trim" text;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "mileage" integer;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "bodyStyle" text;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "vin" text;
  ALTER TABLE public."InventoryItem" ADD COLUMN IF NOT EXISTS "photosJson" jsonb;

  UPDATE public."InventoryItem"
  SET "priceCents" = ROUND(COALESCE("price",0) * 100)::bigint
  WHERE "priceCents" IS NULL AND "price" IS NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auctionoffer_auctionid_fkey'
      AND conrelid = 'public."AuctionOffer"'::regclass
  ) THEN
    ALTER TABLE public."AuctionOffer"
      ADD CONSTRAINT auctionoffer_auctionid_fkey
      FOREIGN KEY ("auctionId") REFERENCES public."Auction"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pickupappointment_dealerid_fkey'
      AND conrelid = 'public."PickupAppointment"'::regclass
  ) THEN
    ALTER TABLE public."PickupAppointment"
      ADD CONSTRAINT pickupappointment_dealerid_fkey
      FOREIGN KEY ("dealerId") REFERENCES public."Dealer"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shortlistitem_shortlistid_fkey'
      AND conrelid = 'public."ShortlistItem"'::regclass
  ) THEN
    ALTER TABLE public."ShortlistItem"
      ADD CONSTRAINT shortlistitem_shortlistid_fkey
      FOREIGN KEY ("shortlistId") REFERENCES public."Shortlist"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shortlistitem_inventoryitemid_fkey'
      AND conrelid = 'public."ShortlistItem"'::regclass
  ) THEN
    ALTER TABLE public."ShortlistItem"
      ADD CONSTRAINT shortlistitem_inventoryitemid_fkey
      FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventoryitem_dealerid_fkey'
      AND conrelid = 'public."InventoryItem"'::regclass
  ) THEN
    ALTER TABLE public."InventoryItem"
      ADD CONSTRAINT inventoryitem_dealerid_fkey
      FOREIGN KEY ("dealerId") REFERENCES public."Dealer"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_userid_fkey'
      AND conrelid = 'public."Affiliate"'::regclass
  ) THEN
    ALTER TABLE public."Affiliate"
      ADD CONSTRAINT affiliate_userid_fkey
      FOREIGN KEY ("userId") REFERENCES public."User"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referral_affiliateid_fkey'
      AND conrelid = 'public."Referral"'::regclass
  ) THEN
    ALTER TABLE public."Referral"
      ADD CONSTRAINT referral_affiliateid_fkey
      FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"("id") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commission_affiliateid_fkey'
      AND conrelid = 'public."Commission"'::regclass
  ) THEN
    ALTER TABLE public."Commission"
      ADD CONSTRAINT commission_affiliateid_fkey
      FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"("id") NOT VALID;
  END IF;
END $$;
