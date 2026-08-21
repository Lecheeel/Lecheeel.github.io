---
title: "A personal AI stack on a 1.6GB VPS: operational numbers"
description: "What a self-hosted agent, search engine, vector DB and ingest server actually consume — memory and money, measured."
pubDate: 2026-08-21
tags: ["self-hosting", "vps", "costs"]
---

For a few months I have run a personal AI stack on a small VPS: 1 core,
1.6 GB RAM, 40 GB disk, Debian. This note records the measured numbers —
what it runs, what it costs, and the operational rules that emerged from
running it tight.

## What runs on it

- an agent gateway (the one serving this conversation) over Feishu and
  WeChat
- SearXNG as the search backend
- a Qdrant server for vector memory
- a Node ingest server for [memento](/blog/memento/)
- a proxy, because the network requires one

At idle the box has ~400 MB free. Everything above runs inside that
budget.

## The token bill

The LLM behind the agent is DeepSeek, billed per token. To keep the cost
visible, a cron job queries the balance API every hour and appends the
result to a JSONL ledger (capped at 720 entries). Measured over real
weeks of use:

- **0.033 CNY/hour** average burn ≈ **0.8 CNY/day** ≈ **24 CNY/month**
  for all LLM usage (chat, cron-generated summaries, vision).
- The scheduled jobs (nightly summary, hot-topic pushes, balance
  tracking) cost a few fen per day — below the noise floor.
- Long sessions with large context show up as discrete spikes in the
  ledger, which is the point of the ledger: any session's cost is
  inspectable afterwards.

Hosting costs a few yuan a month. Token costs about 24 CNY/month. Both
are close to zero.

## Memory behavior

The constraint that actually bites is RAM, and the failure mode is
gradual: long conversations grow the gateway process. A session with
400+ messages took the gateway to ~700 MB resident, leaving ~150 MB free
— enough that even spawning a Python subprocess felt risky. Three rules
came out of this:

1. **Bound what stays in context.** Memory pressure tracks conversation
   length, so context must be capped and compressed, not accumulated.
2. **Don't spawn heavy helpers for light queries.** A single `curl`
   against an API is cheaper than a Python process when you are counting
   megabytes.
3. **The gateway never runs its own admin CLI.** A scheduled job that
   shelled out to the gateway's CLI deadlocked on a lock the running
   gateway holds — the session froze mid-sentence. Config reads, log
   tails and one-shot scripts go through cron (a separate process) or a
   file write; never through the gateway process itself.

## What the numbers say

The marginal cost of a personal AI stack is near zero — a few fen a day
in tokens, a few yuan a month in hosting. The real cost is attention:
the restart after a memory spike, the hour spent tracing a deadlock, the
surprise that only surfaces because there are 400 MB of headroom and no
margin to hide it.

Two practical consequences:

- **Track the ledger.** The hourly balance log turns "is this
  expensive?" into a lookup. It costs nothing to run and has already
  caught a runaway session.
- **Small machines are honest.** On a big box, problems hide in headroom.
  On a 1.6 GB box every inefficiency surfaces immediately, which makes
  it a good place to learn what your stack actually does.

What is still open: the memory growth curve of the gateway over very
long-lived sessions (days, not hours), and whether the vector DB can
share the box with a second model server if I want local embeddings
instead of a remote API.
