const DEFAULT_PORT = 3000;
const DEFAULT_API_PREFIX = 'api';
const DEFAULT_TRADER_MODEL = 'claude-opus-5-5';
const DEFAULT_LIGHT_MODEL = 'claude-haiku-5-5';
const DEFAULT_NVIDIA_TRADER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const DEFAULT_NVIDIA_LIGHT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const DEFAULT_REVIEW_CRON = '0 23 * * *';
const DEFAULT_WEEKLY_REPORT_CRON = '59 23 * * 0';
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_SCOUT_INTERVAL_SECONDS = 30;
const DEFAULT_GUARDIAN_INTERVAL_SECONDS = 20;
const PUBLIC_RPC_URL = 'https://api.mainnet.solana.com';

const heliusRpcUrl = (apiKey: string | undefined): string =>
  apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : PUBLIC_RPC_URL;

export default () => ({
  port: Number(process.env.PORT) || DEFAULT_PORT,
  apiPrefix: process.env.API_PREFIX || DEFAULT_API_PREFIX,
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  wallet: {
    encryptionKey: process.env.WALLET_ENCRYPTION_KEY,
    liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === 'true',
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || heliusRpcUrl(process.env.HELIUS_API_KEY),
    heliusConfigured: Boolean(process.env.HELIUS_API_KEY),
    heliusApiKey: process.env.HELIUS_API_KEY || undefined,
  },
  birdeye: {
    apiKey: process.env.BIRDEYE_API_KEY || undefined,
  },
  ai: {
    provider: process.env.AI_PROVIDER === 'nvidia' ? 'nvidia' : 'anthropic',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || undefined,
    traderModel: process.env.NVIDIA_TRADER_MODEL || DEFAULT_NVIDIA_TRADER_MODEL,
    lightModel: process.env.NVIDIA_LIGHT_MODEL || DEFAULT_NVIDIA_LIGHT_MODEL,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    traderModel: process.env.ANTHROPIC_TRADER_MODEL || DEFAULT_TRADER_MODEL,
    lightModel: process.env.ANTHROPIC_LIGHT_MODEL || DEFAULT_LIGHT_MODEL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  engine: {
    enabled: process.env.ENGINE_ENABLED !== 'false',
    forensicsEnabled: process.env.FORENSICS_ENABLED !== 'false',
    walletDiscoveryEnabled: process.env.WALLET_DISCOVERY_ENABLED !== 'false',
    walletDiscoveryMinutes: Number(process.env.WALLET_DISCOVERY_MINUTES) || 30,
    copyIntervalSeconds: Number(process.env.COPY_INTERVAL_SECONDS) || 20,
    scoutIntervalSeconds: Number(process.env.SCOUT_INTERVAL_SECONDS) || DEFAULT_SCOUT_INTERVAL_SECONDS,
    guardianIntervalSeconds: Number(process.env.GUARDIAN_INTERVAL_SECONDS) || DEFAULT_GUARDIAN_INTERVAL_SECONDS,
    reviewCron: process.env.SELF_HEALING_CRON || DEFAULT_REVIEW_CRON,
    weeklyReportCron: process.env.WEEKLY_REPORT_CRON || DEFAULT_WEEKLY_REPORT_CRON,
    timezone: process.env.TIMEZONE || DEFAULT_TIMEZONE,
  },
});
