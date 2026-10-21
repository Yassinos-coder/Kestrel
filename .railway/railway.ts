import { defineRailway, github, preserve, project, service } from "railway/iac";

const REGION = "europe-west4-drams3a";
const IN_REGION = { [REGION]: 1 };
const MB = 1_000_000;

const NODE_VERSION = "26";

const SHARED_NODE_FILES = ["/bun.lock", "/package.json", "/turbo.json", "/packages/shared/**"];

const watching = (buildCommand: string, ...paths: string[]) => ({
  buildCommand,
  watchPatterns: [...paths, ...SHARED_NODE_FILES],
});

const limits = (cpu: number, memoryBytes: number) => ({
  limitOverride: { containers: { cpu, memoryBytes } },
});

const nodeStart = (appDirectory: string) => `cd ${appDirectory} && exec node --max-old-space-size=512 dist/main`;

const previewStart = (appDirectory: string) =>
  `cd ${appDirectory} && exec node --max-old-space-size=256 node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $PORT`;

export default defineRailway(() => {
  const repo = github("Yassinos-coder/Kestrel", { branch: "main", checkSuites: false });

  const server = service("Kestrel Server", {
    source: repo,
    build: watching(
      "bun run --filter @kestrel/server db:generate && bun run --filter @kestrel/server build",
      "/apps/server/**",
    ),
    start: nodeStart("apps/server"),
    preDeploy: "bun run --filter @kestrel/server db:deploy",
    healthcheck: "/api/health/live",
    healthcheckTimeout: 60,
    replicas: IN_REGION,
    deploy: limits(1, 1_000 * MB),
    domains: [{ domain: "api.kestrel.sidedevelopments.com", port: 3000 }],
    networking: { privateNetworkEndpoint: "kestrel-server" },
    env: {
      NODE_ENV: "production",
      PORT: "3000",
      API_PREFIX: "api",
      RAILPACK_NODE_VERSION: NODE_VERSION,
      DATABASE_URL: preserve(),
      JWT_SECRET: preserve(),
      CORS_ORIGINS: preserve(),
      HELIUS_API_KEY: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      ANTHROPIC_TRADER_MODEL: preserve(),
      ANTHROPIC_LIGHT_MODEL: preserve(),
      TELEGRAM_BOT_TOKEN: preserve(),
      TELEGRAM_CHAT_ID: preserve(),
      LIVE_TRADING_ENABLED: preserve(),
      WALLET_ENCRYPTION_KEY: preserve(),
      TIMEZONE: preserve(),
      SELF_HEALING_CRON: preserve(),
    },
  });

  const web = service("Kestrel Web", {
    source: repo,
    build: watching("bun run --filter @kestrel/web build", "/apps/web/**"),
    start: previewStart("apps/web"),
    replicas: IN_REGION,
    deploy: limits(1, 512 * MB),
    domains: ["kestrel.sidedevelopments.com"],
    networking: { privateNetworkEndpoint: "kestrel-web" },
    env: {
      RAILPACK_NODE_VERSION: NODE_VERSION,
      VITE_API_URL: preserve(),
    },
  });

  return project("Kestrel", {
    variables: { managed: false },
    resources: [server, web],
  });
});
