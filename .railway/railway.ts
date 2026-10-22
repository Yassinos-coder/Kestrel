import { defineRailway, github, postgres, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Kestrel = github("Yassinos-coder/Kestrel", { branch: "main", checkSuites: false });

  const Postgres = postgres("Postgres", { region: "asia-southeast1-eqsg3a" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "asia-southeast1-eqsg3a", sizeMB: 5000 });
  const KestrelWeb = service("Kestrel Web", {
    source: Kestrel,
    build: { buildCommand: "bun run --filter @kestrel/shared build && bun run --filter @kestrel/web build", buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/apps/web/**", "/bun.lock", "/package.json", "/turbo.json", "/packages/shared/**"] },
    start: "cd apps/web && exec node --max-old-space-size=256 node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $PORT",
    replicas: { "europe-west4-drams3a": 1 },
    deploy: { limitOverride: { containers: { cpu: 1, memoryBytes: 512000000 } } },
    domains: ["kestrel.sidedevelopments.com"],
    networking: { privateNetworkEndpoint: "kestrel-web" },
  });
  const KestrelServer = service("Kestrel Server", {
    source: Kestrel,
    build: { buildCommand: "bun run --filter @kestrel/shared build && bun run --filter @kestrel/server db:generate && bun run --filter @kestrel/server build", buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/apps/server/**", "/bun.lock", "/package.json", "/turbo.json", "/packages/shared/**"] },
    start: "cd apps/server && exec node --max-old-space-size=512 dist/main",
    healthcheck: "/api/health/live",
    healthcheckTimeout: 60,
    preDeploy: "bun run --filter @kestrel/server db:deploy",
    replicas: { "europe-west4-drams3a": 1 },
    deploy: { limitOverride: { containers: { cpu: 1, memoryBytes: 1000000000 } } },
    domains: [{ domain: "api.kestrel.sidedevelopments.com", port: 3000 }],
    networking: { privateNetworkEndpoint: "kestrel-server" },
  });

  return project("Kestrel", {
    variables: { managed: false },
    resources: [KestrelWeb, KestrelServer, Postgres, postgresVolume],
  });
});
