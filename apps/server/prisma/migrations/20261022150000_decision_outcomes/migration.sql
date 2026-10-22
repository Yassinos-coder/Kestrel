-- CreateTable
CREATE TABLE "decision_outcomes" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "base_market_cap_usd" DOUBLE PRECISION NOT NULL,
    "change_1h_pct" DOUBLE PRECISION,
    "change_4h_pct" DOUBLE PRECISION,
    "change_24h_pct" DOUBLE PRECISION,
    "peak_change_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decision_outcomes_decision_id_key" ON "decision_outcomes"("decision_id");

-- CreateIndex
CREATE INDEX "decision_outcomes_user_id_created_at_idx" ON "decision_outcomes"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
