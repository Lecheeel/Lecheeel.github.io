---
title: "Working rules for coding agents"
description: "The rules that actually changed agent session outcomes in my setup: analyze before search, interrogate unclear requirements, parallelize independent work, and close the loop with verification and recorded lessons."
pubDate: 2026-08-16
tags: ["ai", "workflow", "agents"]
---

I run coding agents daily — the harness kind, with command execution and
file editing. After enough sessions where an agent went confidently in
the wrong direction, I distilled the rules that actually change
outcomes. These are written into the project-level instructions every
agent reads before working on my repositories.

## 1. Analyze first, search second

An agent's first instinct is to search. The rule is the reverse: analyze
the problem and the local code first, then search for two specific
things, in order:

1. **What changed recently?** The agent's training data is stale by
   definition. Searching syncs it with the present and removes the worst
   hallucination classes (removed APIs, renamed flags, deprecated
   patterns).
2. **Does a solution already exist?** If this problem was solved before,
   find that solution and adapt it, rather than re-deriving it badly.

The failure mode this prevents is the confident reimplementation of
something that was solved years ago.

## 2. Interrogate unclear requirements — then propose a default

An unclear requirement is a user-side mistake, but the agent pays for it.
The rule: if the requirement is ambiguous, do not act; ask. But ask once,
specifically, and attach a proposed default — forcing the user to
enumerate options for you is its own failure. Trivial details do not
deserve confirmation; structural ambiguity does.

## 3. Parallelize independent work into subagents

An agent that does everything in one context accumulates noise until it
drowns. If a task decomposes into independent parts, they should run as
independent agents with isolated contexts, and only their results should
rejoin the main thread. A 20-step sequential slog becomes 3 parallel
streams, and each stream stays coherent.

## 4. Close the loop: verify, then record

Most workflows stop at "the change is written." The loop is only closed
when the change is verified (tests run, behavior checked) and the lesson
is recorded somewhere reusable. My setup keeps a running set of
principles per project; after each session, new pitfalls get appended so
the next session starts with them. The cycle, written out:

```
analyze → search → clarify → act → verify → record
```

Each step skipped becomes a cost paid by a later session. The
verification and recording steps are the ones most often skipped, and
the ones that compound.
