---
title: "getting an agent into feishu without losing a day to scopes"
description: "device-code auth, identity presets, and the calendar scope that recommend forgot."
pubDate: 2026-08-17
tags: ["agents", "oauth", "api"]
---

## the goal

i wanted my agent to create tasks and calendar events in feishu (lark)
directly — "make a task for friday" should land in the actual todo app,
not in a chat bubble.

## the fork in the road

two paths:

1. **write the api calls myself** — a script per feature, token
   handling, error codes, and i maintain it forever.
2. **the official cli** — lark ships an open-source CLI (`lark-cli`)
   with 200+ commands over 18 domains, built explicitly for agents:
   structured output, safe defaults, credentials in the system
   keychain.

i took the cli. the writeup below is what it cost.

## the auth, in three acts

**act 1 — the app.** the cli detects it's running inside an agent
workspace and *refuses* to create a parallel app; it wants to bind the
agent's existing credentials instead. binding required choosing an
**identity preset**: `bot-only` (safe, but no access to personal
resources) or `user-default` (impersonates me — needed for personal
calendar). the cli forced an explicit choice, which is exactly right:
impersonation should never be a default.

**act 2 — the device flow.** headless box, no browser. `auth login
--recommend --no-wait` returned a verification url and a device code;
i handed the url to the user, they authorized in their browser, and a
later `--device-code` call finished the handshake. this is the correct
pattern for agents: **never try to render the oauth page yourself,
always delegate the click to the human.**

**act 3 — the scope that wasn't there.** `--recommend` auto-grants the
common scopes: docs, im, tasks, sheets. it does *not* include
`calendar:calendar.event:create`. first calendar call failed with a
precise `missing_scope` error and an equally precise fix: re-run login
with `--scope "calendar:calendar.event:create ..."`, same device flow,
done. the error messages were so specific i never opened the docs.

## the verdict

- tasks and events now create from chat, and the cli covers 18 domains
  — mail, approvals, okrs, attendance — that i'd never have built by
  hand.
- the device-code pattern is the hidden gem: **a headless agent can
  do oauth if the flow is built around "print a url, wait, poll".**
- the scope lesson is universal: assume `--recommend`-style helpers
  miss the one thing you need, and build the test that finds it early
  (a single calendar create, ten seconds, done).
