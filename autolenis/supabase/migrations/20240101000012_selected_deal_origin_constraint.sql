-- FIX 12: SelectedDeal origin exclusivity constraint
-- A SelectedDeal must originate from EITHER an auction deal (auctionId IS NOT NULL)
-- OR a sourced deal (sourcedOfferId IS NOT NULL), but NOT BOTH.
-- Deals with neither set are also permitted (legacy/admin-created).

ALTER TABLE "SelectedDeal"
  ADD CONSTRAINT "chk_selected_deal_origin_exclusivity"
  CHECK (
    NOT ("auctionId" IS NOT NULL AND "sourcedOfferId" IS NOT NULL)
  );

COMMENT ON CONSTRAINT "chk_selected_deal_origin_exclusivity" ON "SelectedDeal"
  IS 'FIX 12: A deal cannot simultaneously be an auction deal AND a sourced deal. Set either auctionId or sourcedOfferId, never both.';
