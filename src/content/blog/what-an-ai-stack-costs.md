---
title: "what running an ai stack actually costs"
description: "real numbers from a 1.6GB vps: tokens, cron jobs, and the thing that's actually expensive."
pubDate: 2026-08-16
tags: ["self-hosting", "costs", "ai"]
---

## the setup

a 1.6GB vps running an agent gateway, a search engine, a vector db, and
a notification ingest server. the llm behind it all is deepseek — cheap,
capable, and direct (no relay in the middle, which after my other
post about [watered-down relays](/blog/watering-down-ai-relays/) is
non-negotiable).

## the token bill

i track the balance every hour — a cron job that hits the balance api
and appends to a jsonl file, capped at 720 entries so it never grows
unbounded. the numbers, over a real week:

- **0.033 cny/hour** of average burn. that's about **0.8 cny/day**,
  or roughly **24 cny/month** of llm usage.
- the daily cron jobs — a summary report, hot-topic pushes, hourly
  balance checks — cost **a few fen per day**. literally noise.
- the expensive-looking part (long sessions with big context) shows up
  as a real spike in the balance log, which is exactly why the hourly
  tracker exists: you can *see* what a session cost.

to put it in perspective: the tracking system itself, running 24
queries a day against the balance api, costs fractions of a fen. the
billing api is the cheapest part of the stack.

## the non-token costs

- **the vps**: cheaper than a coffee a month, and it runs the whole
  stack.
- **the search engine, the vector db, the agent**: all free software,
  all self-hosted.
- **my attention**: the only real line item. the 2am `systemctl
  restart`, the hour debugging why a cron job hung the gateway, the
  session where memory pressure killed the agent mid-thought — *that's*
  the cost, and it's the one nobody budgets for.

## the takeaway

the marginal cost of an ai stack is nearly zero — a few fen a day in
tokens, a few yuan a month in hosting. the real cost is operational
attention, and the way to pay less of it is boring: measure everything
(hourly balance logs), automate everything (cron, self-deploying
sites), and write down the failures (that's what this blog is for).

if you're hesitating about self-hosting because of "the cost" — check
your balance log first. it's probably a few fen.
