---
title: "an agent workflow that closes the loop"
description: "rules i give my coding agents. they were learned the expensive way."
pubDate: 2026-08-16
tags: ["ai", "workflow", "agents"]
---

i use coding agents a lot — the terminal kind, the harness kind, the
ones that can run commands and edit files. after enough sessions where
the agent went off in a confident wrong direction, i wrote down the
rules that actually stop it.

## analyze before you search

an agent's first instinct is to search. mine too. the rule is the
reverse: **analyze the problem first, then search** — and search for two
specific things, in order:

1. what changed recently? the agent's training data is stale by
   definition. searching syncs it with the present and kills the worst
   hallucinations (old APIs, renamed flags, removed features).
2. does a solution already exist? if someone already fought this bug,
   i don't want my agent to re-fight it. find the answer, then adapt it.

the failure mode this prevents is the agent confidently reimplementing
something that was solved years ago, badly.

## when the requirement is unclear, interrogate

unclear requirements are a user failure, but the agent pays for it. the
rule: **if you don't understand the requirement, do not act.** ask.
specifically. and offer a default, because forcing the user to design
your options for you is also a failure. ask, propose the default, move
on — don't nickel-and-dime the details that don't matter.

## use subagents for the heavy lifting

an agent that does everything in one context drowns. parallel subagents
with isolated contexts turn a 20-step slog into 3 parallel streams. the
rule is simple: if a task has independent parts, they should run as
independent agents.

## close the loop

the part most workflows miss: **verification and memory**. a change
isn't done when it's written — it's done when it's tested, and the
lessons land somewhere reusable. i keep a running set of principles
every agent must read before touching a project, and after every
session, the new lessons get appended. the workflow is only as good as
its feedback loop:

```
analyze → search → clarify → act → verify → record
```

skip any step and the next session pays for it.
