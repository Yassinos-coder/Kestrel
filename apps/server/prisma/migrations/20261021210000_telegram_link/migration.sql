-- AlterTable
ALTER TABLE "bot_settings" ADD COLUMN     "telegram_chat_id" TEXT,
ADD COLUMN     "telegram_link_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bot_settings_telegram_link_code_key" ON "bot_settings"("telegram_link_code");
