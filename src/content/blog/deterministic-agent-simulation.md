---
title: "deterministic multi-agent simulation is a debugging tool"
description: "if you can't replay a run, you can't debug it. the case for byte-level determinism in agent worlds."
pubDate: 2026-08-16
tags: ["agents", "simulation", "systems"]
---

## why determinism

most agent frameworks are one-shot demos: run once, get lucky, throw it
away. that works until the thing you're building is a *system* — a
market, a city, a crowd — where the interesting questions are about
distributions, not single runs. and the moment you want to study a
distribution, you need to know that two runs with the same inputs
actually *are* the same world.

the project i've been working on ([worldline-engine](https://github.com/Lecheeel/worldline-engine))
ships determinism as the core guarantee, not an afterthought. here's what
that takes, and why it's worth it.

## what breaks determinism

three things, in order of sneakiness:

**1. randomness.** python's `random`, hashing iteration order, `set`
ordering — all non-deterministic across runs unless you seed and pin
them. most frameworks never even try.

**2. concurrency.** threads and async introduce scheduling noise. the
same program, two runs, different interleavings. determinism and
concurrency are fundamentally in tension — you pick one inside the
simulation core.

**3. the llm itself.** this is the one nobody talks about. an llm call
is a *stream*: same prompt, slightly different tokens this run. for
replay to work, you don't just store the inputs — you store the
**response stream** and treat it as part of the world's input. same
seed, same inputs, same response stream → identical world. that's the
contract.

## the design that makes it work

- **worldlines, not worlds.** every `seed` defines one worldline. the
  scheduler is deterministic, so a single worldline is internally
  consistent, auditable, replayable. divergence *across* worldlines is
  the data you study — that's the butterfly effect as a feature, not a
  bug.

- **checkpoints, not reruns.** state is snapshotted, events are
  appended. a long experiment resumes from its last checkpoint instead
  of starting over, and the event log is the audit trail.

- **isolated failure.** an agent's tentative action is *staged* and
  validated before it touches world state. a bad agent can fail
  loudly without polluting the world — which matters when you're
  running a hundred agents and two of them are hallucinating.

- **time with structure.** ticks and turns make long-running
  interactions observable instead of a black box. you can ask "what
  happened at tick 400" and get an answer.

- **zero dependencies.** the core is pure python stdlib. no llm sdk, no
  vector db, no framework lock-in — the domain owns the meaning, the
  engine owns execution.

## the payoff

determinism turns "the simulation did something weird" into "the
simulation did the same weird thing again, and i can inspect the exact
tick where it diverged". that's not a luxury — that's the difference
between a system you can debug and a system you can only watch.
