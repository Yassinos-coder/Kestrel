# Kestrel

AI-assisted Solana meme coin trading bot. Paper mode first, live mode behind an explicit gate.

## Layout

| Path | Purpose |
|---|---|
| `apps/server` | NestJS API, pre-buy checklist engine |
| `apps/web` | React + Vite dashboard |
| `packages/shared` | Interfaces shared between server and web |
| `.railway` | Railway infrastructure as code |

## Commands

```
bun install
bun run dev
bun run build
bun run test
```

## Pre-buy checklist

Ten rules in `apps/server/src/checklist`. Rules 1-7 and 10 are hard gates, rules 8 and 9 are scored.
Thresholds live in `constants/checklist-thresholds.constant.ts`.
