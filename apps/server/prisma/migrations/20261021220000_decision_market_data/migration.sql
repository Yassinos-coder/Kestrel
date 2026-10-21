-- AlterTable
ALTER TABLE "decisions" ADD COLUMN     "market_cap_usd" DOUBLE PRECISION,
ADD COLUMN     "pair_address" TEXT;

-- Backfill from the scan each decision was made on
UPDATE "decisions" AS d
SET "pair_address" = s."pair_address",
    "market_cap_usd" = NULLIF(s."snapshot"->>'marketCapUsd', '')::double precision
FROM "token_scans" AS s
WHERE d."scan_id" = s."id";

-- CreateIndex
CREATE INDEX "decisions_user_id_market_cap_usd_idx" ON "decisions"("user_id", "market_cap_usd");
