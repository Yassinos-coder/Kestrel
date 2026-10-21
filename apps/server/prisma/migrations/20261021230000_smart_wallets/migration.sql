-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "follow_id" UUID,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'AI';

-- CreateTable
CREATE TABLE "smart_wallets" (
    "id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_active_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "budget_sol" DOUBLE PRECISION NOT NULL,
    "max_per_trade_sol" DOUBLE PRECISION NOT NULL,
    "max_loss_sol" DOUBLE PRECISION NOT NULL,
    "min_liquidity_usd" DOUBLE PRECISION NOT NULL DEFAULT 8000,
    "mirror_sells" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "smart_wallets_address_key" ON "smart_wallets"("address");

-- CreateIndex
CREATE INDEX "smart_wallets_status_score_idx" ON "smart_wallets"("status", "score");

-- CreateIndex
CREATE INDEX "copy_follows_status_idx" ON "copy_follows"("status");

-- CreateIndex
CREATE UNIQUE INDEX "copy_follows_user_id_wallet_id_key" ON "copy_follows"("user_id", "wallet_id");

-- CreateIndex
CREATE INDEX "positions_follow_id_idx" ON "positions"("follow_id");

-- AddForeignKey
ALTER TABLE "copy_follows" ADD CONSTRAINT "copy_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copy_follows" ADD CONSTRAINT "copy_follows_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "smart_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

