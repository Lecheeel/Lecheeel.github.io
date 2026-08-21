---
title: "Deterministic multi-agent simulation as a research method"
description: "The reproducibility problem in social simulation is an implementation problem. A deterministic kernel turns it into an experimental one."
pubDate: 2026-08-21
tags: ["simulation", "agents", "research"]
---

This note is about the design decision at the center of my
[worldline-engine](https://github.com/Lecheeel/worldline-engine) project:
determinism as the base layer of a multi-agent simulation, and what that
makes possible.

## The question worth asking

Most agent frameworks are run once: you start a simulation, watch something
interesting happen, and report it. That is fine for a demo. It is not a
research method. Once the question becomes *what could happen* rather than
*what happened*, a single run carries no evidence, and a set of runs only
carries evidence if you know that identical inputs produce identical
worlds. Otherwise the differences you observe are a mixture of your model
and your implementation, and there is no way to separate them.

This is the reproducibility problem that quietly weakens a lot of social
simulation. Two implementations of "the same model" produce different
outcomes, and the difference is usually not the model: it is hash
iteration order, floating-point evaluation order, thread scheduling, or a
random seed that was never recorded. The simulation is already stochastic
by design, so the noise is invisible — and unreproducible too.

## What breaks determinism

Three sources, in increasing order of how easy they are to miss:

1. **Randomness.** Python's `random`, dict/set iteration order, hash-based
   iteration — all nondeterministic across runs unless explicitly seeded
   and pinned. Most frameworks do not pin them at all.

2. **Concurrency.** Threads and async coroutines introduce scheduling
   noise: the same program, two runs, different interleavings.
   Determinism and concurrency are fundamentally in tension, and the
   resolution is architectural: the simulation core is single-threaded and
   sequential; parallelism happens in experiment orchestration (many
   worldlines), not inside one worldline.

3. **The LLM itself.** This is the one that is specific to agent
   simulation. An LLM call is a stream of sampled tokens; the same prompt
   produces different text on every call. For replay to be meaningful, the
   recorded input is not just "the prompt" but **the response stream**,
   treated as part of the world's input. The contract becomes: same seed,
   same agent inputs, same recorded response stream → byte-identical
   world. Replay is not re-running the LLM; it is re-consuming its
   recorded output.

## The design

A few mechanisms follow directly from that contract:

- **Worldlines, not worlds.** Each seed defines one worldline — one
  self-consistent history. The scheduler is deterministic, so a worldline
  is internally consistent and auditable. Divergence *across* worldlines
  is the measurement, not an artifact.

- **Checkpoints and an append-only event log.** State is snapshotted
  periodically; every action is appended as an event. Long experiments
  resume from checkpoints instead of restarting, and the event log doubles
  as the audit trail. "Why did this happen at tick 400?" is answerable by
  reading the log.

- **Staged actions.** An agent's action is staged and validated against
  the world's rules before it touches shared state. A misbehaving agent
  fails inside its own staged transaction. This matters at scale: in a
  simulation of a hundred agents, some will hallucinate, and their
  hallucinations must be containable.

- **Structured time.** Discrete ticks and turns make long runs
  inspectable. Time is a coordinate, not a duration.

- **Zero dependencies in the core.** The engine is Python stdlib only.
  The world definition (agents, rules, meaning) is owned by the
  simulation author; the engine owns only execution. This keeps the
  kernel small enough to audit and the determinism claim testable.

## What determinism buys

With the contract holding, four things become available that are
otherwise out of reach in social simulation:

**Reproducibility.** Anyone can run your exact worldline. If their
outcome differs, the difference is theirs to explain — the engine is no
longer a plausible excuse for implementation noise.

**Ablation.** Change one rule or one parameter, re-run, diff. Because
everything else is pinned, the outcome difference is attributable to that
change. Causal claims in social models usually rest on comparison;
determinism is what makes the comparison clean.

**Distributions instead of anecdotes.** One run is a story. A seeded sweep
of a thousand worldlines is a measurement — the spread across seeds is an
estimate of uncertainty, with a sample size you chose and can increase.

**Auditability.** Every step is an event in a checkpointed timeline.
Regulators, reviewers, or your future self can point at the exact tick
where a trajectory diverged.

## Where the stochasticity lives

A common objection: real social systems are not deterministic, so a
deterministic engine models nothing real. The objection misunderstands
where the randomness is placed in this design. The seed sweep is the
stochastic layer, deliberately: each seed is a sample from the space of
possible worlds, and the sweep is the experiment. Determinism lives in
the *engine*; uncertainty lives in the *experimental design*. Separating
the two is what makes each one honestly measurable — you can report how
much variation comes from the seed (aleatoric, irreducible) and how much
comes from the implementation (which, with this design, is zero).

## Open problems

The contract has real costs, and they are the frontier of this work:

- **Recorded streams are large.** A long multi-agent run stores megabytes
  of LLM output per worldline. Compression or selective recording is
  needed before thousand-worldline sweeps are cheap.
- **Model upgrades invalidate recordings.** A replay is only valid for
  the model version that produced it. Version pinning works for research;
  it makes longitudinal comparisons awkward.
- **Determinism is a property you can lose silently.** A single unseeded
  `random.random()` anywhere in the world definition reintroduces noise
  without any error. The current answer is an invariant test: run the
  same seed twice and byte-diff the event logs. It catches regressions,
  but only if the test suite is run.
