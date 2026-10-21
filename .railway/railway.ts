import { defineRailway, github, project, service } from "railway/iac";

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
    build: watching("bun run --filter @kestrel/server build", "/apps/server/**"),
    start: nodeStart("apps/server"),
    healthcheck: "/api/health/live",
    healthcheckTimeout: 60,
    replicas: IN_REGION,
    deploy: limits(1, 1_000 * MB),
    networking: { privateNetworkEndpoint: "kestrel-server" },
    env: {
      NODE_ENV: "production",
      RAILPACK_NODE_VERSION: NODE_VERSION,
      API_PREFIX: "api",
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
    },
  });

  return project("Kestrel", {
    variables: { managed: false },
    resources: [server, web],
  });
});
