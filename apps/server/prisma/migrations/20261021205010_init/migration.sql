-- CreateEnum
CREATE TYPE "TradingMode" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "RiskProfile" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DecisionAction" AS ENUM ('BUY', 'SKIP', 'REJECTED');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "display_name" TEXT,
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_nonces" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mode" "TradingMode" NOT NULL DEFAULT 'PAPER',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "starting_paper_balance_sol" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "paper_cash_sol" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "auto_sweep" BOOLEAN NOT NULL DEFAULT false,
    "live_bankroll_sol" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_set_versions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "params" JSONB NOT NULL,
    "playbooks" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_set_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "trades_in_window" INTEGER NOT NULL,
    "trades_reviewed" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "report" JSONB,
    "applied_changes" JSONB,
    "rejected_changes" JSONB,
    "rule_version_after" INTEGER,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "review_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_key" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_scans" (
    "id" UUID NOT NULL,
    "mint" TEXT NOT NULL,
    "pair_address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" "DecisionAction" NOT NULL,
    "confidence" INTEGER,
    "size_sol" DOUBLE PRECISION,
    "plan" JSONB,
    "reasoning" TEXT,
    "report" JSONB NOT NULL,
    "agents" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "decision_id" UUID,
    "mode" "TradingMode" NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "pair_address" TEXT NOT NULL,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "entry_sol" DOUBLE PRECISION NOT NULL,
    "entry_price_sol" DOUBLE PRECISION NOT NULL,
    "tokens_bought" DOUBLE PRECISION NOT NULL,
    "tokens_held" DOUBLE PRECISION NOT NULL,
    "realized_sol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peak_price_sol" DOUBLE PRECISION NOT NULL,
    "last_price_sol" DOUBLE PRECISION NOT NULL,
    "plan" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "exit_reason" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "side" "TradeSide" NOT NULL,
    "reason" TEXT NOT NULL,
    "price_sol" DOUBLE PRECISION NOT NULL,
    "sol_amount" DOUBLE PRECISION NOT NULL,
    "token_amount" DOUBLE PRECISION NOT NULL,
    "fees_sol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_lessons" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "outcome_pct" DOUBLE PRECISION NOT NULL,
    "exit_reason" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "lesson" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_sweeps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_sol" DOUBLE PRECISION NOT NULL,
    "signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_sweeps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "auth_nonces_nonce_key" ON "auth_nonces"("nonce");

-- CreateIndex
CREATE INDEX "auth_nonces_wallet_address_idx" ON "auth_nonces"("wallet_address");

-- CreateIndex
CREATE INDEX "auth_nonces_expires_at_idx" ON "auth_nonces"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "bot_settings_user_id_key" ON "bot_settings"("user_id");

-- CreateIndex
CREATE INDEX "rule_set_versions_user_id_active_idx" ON "rule_set_versions"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "rule_set_versions_user_id_version_key" ON "rule_set_versions"("user_id", "version");

-- CreateIndex
CREATE INDEX "review_runs_user_id_started_at_idx" ON "review_runs"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "bot_wallets_user_id_key" ON "bot_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_wallets_public_key_key" ON "bot_wallets"("public_key");

-- CreateIndex
CREATE UNIQUE INDEX "token_scans_mint_key" ON "token_scans"("mint");

-- CreateIndex
CREATE INDEX "token_scans_scanned_at_idx" ON "token_scans"("scanned_at");

-- CreateIndex
CREATE INDEX "decisions_user_id_created_at_idx" ON "decisions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "decisions_user_id_mint_idx" ON "decisions"("user_id", "mint");

-- CreateIndex
CREATE INDEX "positions_user_id_status_idx" ON "positions"("user_id", "status");

-- CreateIndex
CREATE INDEX "positions_status_idx" ON "positions"("status");

-- CreateIndex
CREATE INDEX "trades_user_id_created_at_idx" ON "trades"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "trades_position_id_idx" ON "trades"("position_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_lessons_position_id_key" ON "trade_lessons"("position_id");

-- CreateIndex
CREATE INDEX "trade_lessons_user_id_created_at_idx" ON "trade_lessons"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "profit_sweeps_user_id_created_at_idx" ON "profit_sweeps"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_set_versions" ADD CONSTRAINT "rule_set_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_wallets" ADD CONSTRAINT "bot_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "token_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_lessons" ADD CONSTRAINT "trade_lessons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_lessons" ADD CONSTRAINT "trade_lessons_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_sweeps" ADD CONSTRAINT "profit_sweeps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
