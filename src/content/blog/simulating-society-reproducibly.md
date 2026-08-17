---
title: "simulating society, reproducibly"
description: "social simulation has a reproducibility problem. the fix is the same one that fixed software: determinism."
pubDate: 2026-08-17
tags: ["simulation", "research", "agents"]
---

## the reproducibility problem in social simulation

social simulations — models of crowds, markets, communities — have a
quiet credibility problem. two researchers implement "the same model"
and get different results. same paper, same equations, different
outcomes. usually it's not fraud; it's **non-determinism leaking in
through the implementation**: hash order, floating point, thread
scheduling, a random seed nobody wrote down. the simulation is
technically stochastic anyway, so nobody notices — and nobody can
reproduce it either.

in any other engineering discipline this is called a bug. in social
simulation it's called "emergent behavior".

## the fix: make the engine deterministic, then make it social

my [worldline](https://github.com/Lecheeel/worldline-engine) kernel
treats determinism as the base layer, and the social-simulation layer
([worldline-social](https://github.com/Lecheeel/worldline-social))
sits on top of it. the contract is simple and strong:

> same seed + same inputs + same agent response stream → **same world**,
> byte for byte.

once that holds, social simulation gets the tools every other
experimental field takes for granted:

- **reproducibility.** a colleague can run your exact worldline. if the
  outcome differs, the difference is *yours to explain* — the engine
  is no longer an excuse.
- **ablation.** remove one rule, change one parameter, re-run. because
  everything else is pinned, the diff in outcomes is attributable.
  causality stops being vibes.
- **distribution, not anecdote.** a single run of a social model is a
  story. a thousand worldlines from a seeded sweep is a *measurement*
  — the spread across seeds is the uncertainty, and it's real,
  inspectable data.
- **audit.** every step is an append-only event in a checkpointed
  timeline. "why did the market crash at tick 400" has an answer you
  can point at.

## why this matters for "social" specifically

social systems are exactly where hand-waving is most dangerous: the
stakes are people, and the models are complex enough that nobody can
eyeball the outputs. a deterministic substrate doesn't make the model
right — it makes it **checkable**. that's the whole ask.

the humanities-flavored objection is "but society isn't
deterministic". correct — and the framework agrees: the seed sweep is
the stochastic part, deliberately. determinism lives in the *engine*,
uncertainty lives in the *experiment design*. separating the two is
what lets you study the second honestly.

boring engineering, interesting problems — applied to the social
sciences, the boring part is exactly what's missing.
