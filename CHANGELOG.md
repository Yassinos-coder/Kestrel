# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
