# Kestrel

An AI trading desk for Solana meme coins that studies its own trades every night and rewrites its own rules inside hard guardrails. Paper mode first, live trading behind an explicit switch.

> **Risk notice.** Meme coin trading is high risk and most tokens go to zero. Kestrel is experimental software, not financial advice, and nothing here guarantees profit. Run it in paper mode, read the code, and never fund the bot wallet with money you cannot afford to lose.

## What it does

1. **Scout** watches new and trending Solana pools (GeckoTerminal, DexScreener) and builds a snapshot of every promising token: on-chain mint data (Helius RPC), holder and bundle analysis (RugCheck), exit route (Jupiter) and market structure.
2. **Safety checklist** runs ten rules in code. Hard gates can never be overridden by the AI: revoked mint and freeze authority, clean token extensions, secured and deep liquidity, holder concentration, bundled and sniper supply, creator history, confirmed sell route, timing and portfolio limits. Two scored rules (organic activity, momentum quality) feed a quality score.
3. **Trader agent (Claude)** decides buy or skip on tokens that pass, sizes within the risk limit, and plans the exit: a quick scalp, a swing, or a runner. Without an Anthropic key the bot falls back to rules-only entries.
4. **Guardian** protects every open position with code only, no LLM: exits on dev sells, a run of consecutive sells, several top holders selling, collapsing liquidity, the stop loss, the hold limit, a trailing stop, and a take-profit ladder.
5. **Self-healing**: every night (23:00 by default) a review picks the trades worth learning from, separates signal from noise, and may retune the rules. It can add playbooks such as "one holder owns more than 12%: scalp it with a short hold and half size". Every change is validated against bounds and written as a new rule version you can inspect on the Brain page. A Telegram message reports what it found and changed.
6. **Telegram alerts** for every buy, sell, low funds, daily loss limit, nightly review and a weekly report every Sunday.
7. **Cost awareness**: the trader sees swap fees, priority fees, slippage and price impact for each position size, and code rejects trades whose round-trip cost would eat the edge. The dashboard shows whether trading profit covers fees and the AI's own running cost.
8. **Smart wallets and copy trading**: wallets that consistently profit are discovered and scored. You pick one, set a budget, per-trade cap and loss limit, and the bot mirrors it through the same safety checks.
9. **Suggest a token**: paste a contract address and the bot evaluates it like any other candidate, buying only if it likes it.

## Guardrails the AI cannot cross

- Safety gates (authorities, sellability, token extensions, LP security) are not parameters. The AI cannot change them.
- Every tunable parameter has a fixed range, moves at most 25% per review, and at most 5 parameters change per night.
- Position size is capped at 5% of equity and the daily loss limit at 15%, whatever the AI proposes.
- A parameter change needs at least three reviewed trades. A playbook needs evidence from real trades.
- Live trading needs `LIVE_TRADING_ENABLED=true` on the server, a funded bot wallet, and the user switching mode manually.

## Project layout

```
Kestrel/
├── apps/
│   ├── server/       NestJS API, Prisma, trading engine, agents, self-healing
│   └── web/          React + Vite + Tailwind dashboard
├── packages/
│   └── shared/       Types shared by server and web
├── .railway/         Railway infrastructure as code
└── .github/          CI workflow
```

The scout, guardian and nightly job run inside the server process, so run **one replica** of the server.

## Requirements

- [Node.js](https://nodejs.org) 26 or newer (see `.node-version`)
- [Bun](https://bun.sh) 1.4.3 or newer
- PostgreSQL 15 or newer (Railway's standard PostgreSQL service in production)

## Local setup

```bash
git clone https://github.com/Yassinos-coder/Kestrel.git
cd Kestrel
bun install
```

Create the env files (see [Environment variables](#environment-variables)):

```bash
cp .env.example apps/server/.env     # then fill in the blanks
echo "VITE_API_URL=http://localhost:3000/api" > apps/web/.env
```

Apply the database migrations and start everything:

```bash
bun run --filter @kestrel/server db:generate
bun run --filter @kestrel/server db:deploy
bun run dev
```

- API: http://localhost:3000/api/health/live
- Web: http://localhost:5173

Other commands:

```bash
bun run build       # build every package
bun run test        # unit tests
bun run typecheck   # type-check every package
```

## Environment variables

### Server (`apps/server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Long random string used to sign sessions |
| `CORS_ORIGINS` | yes | Comma separated browser origins allowed to call the API |
| `PORT`, `API_PREFIX` | no | Defaults `3000` and `api` |
| `HELIUS_API_KEY` | recommended | Solana RPC. Without it the public RPC is used and gets rate limited |
| `SOLANA_RPC_URL` | no | Full RPC URL, overrides the Helius key |
| `ANTHROPIC_API_KEY` | recommended | Enables the AI agents and the nightly review. Without it the bot is rules-only and never self-heals |
| `ANTHROPIC_TRADER_MODEL` | no | Default `claude-opus-5-5` |
| `ANTHROPIC_LIGHT_MODEL` | no | Default `claude-haiku-5-5`, used for analyst and post-mortems |
| `TELEGRAM_BOT_TOKEN` | recommended | Alerts. Create a bot with @BotFather and paste its token. Each user then presses **Connect Telegram** on the Settings page and taps Start, no chat id needed |
| `TELEGRAM_CHAT_ID` | no | Optional fallback chat for users who have not connected their own |
| `LIVE_TRADING_ENABLED` | no | `true` allows live mode. Default `false` |
| `WALLET_ENCRYPTION_KEY` | for live | 32 random bytes, base64. Encrypts bot wallet keys. Never change it once a wallet exists. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ENGINE_ENABLED` | no | `false` turns off the scout, guardian and nightly job |
| `SCOUT_INTERVAL_SECONDS`, `GUARDIAN_INTERVAL_SECONDS` | no | Defaults 30 and 20 |
| `SELF_HEALING_CRON` | no | Default `0 23 * * *` |
| `WEEKLY_REPORT_CRON` | no | Default `59 23 * * 0`, the Sunday midnight Telegram report |
| `FORENSICS_ENABLED` | no | Default `true`. Reads holders and swap history from the chain through Helius |
| `WALLET_DISCOVERY_ENABLED`, `WALLET_DISCOVERY_MINUTES` | no | Smart wallet discovery, defaults `true` and 30 |
| `COPY_INTERVAL_SECONDS` | no | How often copy trading polls followed wallets. Default 20 |
| `TIMEZONE` | no | IANA zone that defines "today" and when the review runs. Default `UTC` |

### Web (`apps/web/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Public API URL including `/api`. Read at build time |

## Third-party services

Costs are rough estimates, check each provider.

| Service | Used for | Cost |
|---|---|---|
| [Railway](https://railway.com) | Server, web and PostgreSQL hosting | ~$10 to $50 / month |
| [Helius](https://helius.dev) | Solana RPC, transaction sending | Free tier, then ~$49 / month |
| [Anthropic](https://console.anthropic.com) | Trader, analyst, post-mortem and nightly review models | Usage based, roughly $10 to $60 / month |
| [GeckoTerminal](https://www.geckoterminal.com/dex-api) | New and trending pools, recent trades | Free (rate limited) |
| [DexScreener](https://docs.dexscreener.com) | Pair prices, liquidity, volume | Free |
| [RugCheck](https://rugcheck.xyz) | Holder, bundle and LP analysis | Free tier |
| [Jupiter](https://station.jup.ag) | Exit route checks and swaps | Free tier |
| [Telegram Bot API](https://core.telegram.org/bots/api) | Alerts | Free |

Every live trade also costs network fees, priority fees and slippage.

## Deploying on Railway

`.railway/railway.ts` describes the two app services. Create them from your fork with these commands:

| Service | Build | Pre-deploy | Start | Healthcheck |
|---|---|---|---|---|
| Kestrel Server | `bun run --filter @kestrel/server db:generate && bun run --filter @kestrel/server build` | `bun run --filter @kestrel/server db:deploy` | `cd apps/server && exec node dist/main` | `/api/health/live` |
| Kestrel Web | `bun run --filter @kestrel/web build` | none | `cd apps/web && exec node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $PORT` | none |

Steps:

1. Add a **PostgreSQL** service from Railway's database templates.
2. On the server set `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=3000`, `RAILPACK_NODE_VERSION=26`, plus the variables from the table above.
3. Give the server and the web service their own domains and add the CNAME records Railway shows you.
4. On the server set `CORS_ORIGINS` to the web URL. On the web service set `VITE_API_URL` to the server URL plus `/api`, then redeploy so it is baked into the build.
5. Migrations run automatically before every server deploy.

## Security notes

- Login is a free wallet signature (any wallet that supports the Solana wallet standard, such as Phantom, Solflare or Backpack). Kestrel never gets your wallet key.
- A bot cannot trade through Phantom directly because Phantom only signs when you approve. Live mode uses a dedicated bot wallet generated on the server, with its key encrypted at rest. Withdrawals and profit sweeps can only go to the wallet you signed in with.
- Keep all API keys in environment variables, never in the repository.

## Known limits

- Live execution has been written but **not run against mainnet**. Test with a very small amount first.
- Paper fills model fees, slippage and pool depth pessimistically, but real fills will differ.
- RugCheck and DexScreener data can lag. The checklist is strict on purpose and may reject most tokens, especially ones whose liquidity is not burned or locked.
- Free API tiers are rate limited. A paid Helius plan is the first upgrade to make.

## License

No license has been chosen yet. Until one is added, all rights are reserved by the author.
