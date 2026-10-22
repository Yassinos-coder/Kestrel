# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-10-22

### Added
- Positions now exit when sellers clearly outnumber buyers over the last 5 minutes, confirmed by sell volume

### Changed
- The hold limit is no longer a hard cutoff for a profitable position while buyers still lead: it keeps running with a tighter trailing stop up to a cap
- After the first target recovers the entry cost, the remainder runs past the hold limit on its trailing stop
- The first profit target now sells at least enough to recover the entry cost plus fees
- The trader AI is told to size up when its confidence is high instead of hedging with small positions

## [0.6.0] - 2026-10-22

### Added
- Missed opportunity tracking: every token the AI passes on is checked again after 1, 4 and 24 hours to see how its market cap moved
- The nightly review now sees missed winners, good passes and the weak checks the winners shared, so it can tell whether the bot is too strict
- Brain page card showing passed tokens with their later performance and the reason they were passed

### Changed
- The nightly review still runs on days with no closed trades when enough passed tokens were tracked
- Parameter changes can be justified by missed opportunities, but only with at least 8 tracked passes and 3 missed winners, and always inside the existing limits

## [0.5.0] - 2026-10-22

### Added
- Newly graduated pump.fun tokens are now watched alongside GeckoTerminal pools, so fresh PumpSwap launches reach the safety checks sooner
- The Find wallets now button reports how many wallets were checked and added, or why nothing happened

### Changed
- Momentum scoring is more tolerant of meme coin volatility: overextended now means over +1000% in an hour and selling pressure means under -25% in 5 minutes
- Wallet history requests to Helius are paced and retried so rate limits no longer fail most wallet checks

### Fixed
- Unique traders in the last 5 minutes was shown as zero for suggested tokens and pump.fun graduates, and is now counted from recent trades

## [0.4.2] - 2026-10-22

### Added
- /copy accepts a force option that skips the swap history check for wallets you already trust, and the reply flags the wallet as possibly unscored

## [0.4.1] - 2026-10-22

### Fixed
- Telegram commands no longer stop the server from starting
- Liquidity lock is now measured across all pools weighted by their size, so a tiny unlocked pool no longer makes a token with fully locked main liquidity look unlocked

## [0.4.0] - 2026-10-22

### Added
- Telegram bot commands: /pause and /resume to stop or start trading, /status, /help
- /suggest with a contract address makes the AI evaluate that token and replies with its decision
- /copy with a wallet address (and optional budget) starts copying that wallet, analysing it first if it is not already known
- /review starts the review on demand and sends the result to Telegram
- Commands only work from the chat you linked in Settings

## [0.3.0] - 2026-10-22

### Added
- Smart wallets page: wallets found from recent winners are scored on win rate, profit, consistency and bot-likeness, with filters, sorting and a copy flow where you set the budget, per-trade cap, loss limit and safety options
- Copy trading engine that mirrors buys and sells within your limits, runs every token through the safety checks and pauses itself at your loss limit
- Suggest a token: paste a contract address from the sidebar and the bot runs the full checklist and AI review, opening a position only if it likes the setup
- Profitability card on the dashboard: trading profit after fees and slippage, minus AI running cost, with a clear profitable or not verdict
- On-chain forensics: holders, early buyers, fresh wallets and shared funders read directly from the chain, with exit evidence recorded for learning
- Established trending tokens are now considered alongside new launches
- Paginated, filterable and sortable positions and decisions tables with market cap and DexScreener links
- Weekly Telegram report, Telegram connect button with test message, and trading pause during the nightly review
- Cost awareness: the AI sees swap fees, priority fees, slippage and price impact for each position size, and code rejects trades whose costs would eat the edge
- AI usage is tracked per call and fed into the nightly review together with trading fees

### Changed
- Neutral dark and light palette replaces the previous green theme
- Mobile layout now includes theme and disconnect controls and a full-width suggest button
- Paper fills use the shared cost model with realistic priority fees instead of a fixed fee
- Live orders use the shared slippage tolerances and a lower priority fee cap

### Removed
- Social media agent, replaced by a market-only momentum rule

## [0.2.0] - 2026-10-21

### Added
- Wallet sign-in with any Solana wallet-standard wallet, onboarding and per-user paper accounts
- PostgreSQL schema and migrations with Prisma, deployed before each server release
- Scout that watches new and trending Solana pools and builds market, on-chain and holder snapshots
- Paper trading engine with realistic fills including fees and slippage, and an optional live executor through Jupiter
- Guardian that exits on dev sells, runs of consecutive sells, top holders selling, liquidity collapse, stops and a take-profit ladder
- Claude agents for analysis, trade decisions and post-mortems, with a rules-only fallback when no API key is set
- Nightly self-healing review that selects significant trades, tunes rules inside fixed guardrails, and learns playbooks from patterns
- Telegram alerts for buys, sells, low funds, daily loss limit and the nightly review result, connected per user with one tap from the Settings page and a test message button
- Dashboard with decisions, positions, the brain (rule versions, playbooks, reviews, lessons) and wallet pages
- Bot wallet with encrypted keys, withdrawals and profit sweeps to the signed-in wallet

### Fixed
- Empty environment values are treated as unset instead of crashing the server on boot
- The public Solana RPC fallback now uses the currently documented mainnet endpoint

### Changed
- The safety checklist now takes its thresholds from versioned, AI-tunable rule sets
- The social rule was replaced by a market-only momentum quality rule
- Interface palette and typography now follow a neutral zinc style

## [0.1.0] - 2026-10-21

### Added
- Turborepo monorepo with a NestJS server, a React and Vite web app, and a shared interfaces package
- Pre-buy checklist engine with ten rules: seven hard gates for token safety and limits, plus scored organic-activity and social checks
- Server health endpoint and a web status page that polls it
- Railway infrastructure config for the server and web services, with the web app on kestrel.sidedevelopments.com
- GitHub Actions workflow that builds and tests on every push and pull request
