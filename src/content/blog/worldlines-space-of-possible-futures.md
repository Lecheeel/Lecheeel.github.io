---
title: "worldlines: studying the space of possible futures"
description: "a simulation kernel that doesn't predict the future — it rehearses many of them, and makes the difference between them the object of study."
pubDate: 2026-08-17
tags: ["simulation", "agents", "research"]
---

## the premise

most agent simulations are built to answer one question: *what happens?*
run the world once, read the outcome, done. i think that's the wrong
question. the interesting one is *what could happen* — and the only
honest way to study that is to run the world many times, with the
kernel guaranteeing that differences between runs come from the
**inputs you varied, not from noise in the engine**.

that's the design bet behind [worldline-engine](https://github.com/Lecheeel/worldline-engine):
a deterministic execution kernel where every `seed` defines one
**worldline** — one self-consistent history of a simulated world.

## the method

three pieces make the approach work:

**deterministic scheduling.** the same seed, the same agent inputs, the
same llm response stream → the same world, byte for byte. this is the
load-bearing guarantee: it turns "the simulation did something weird"
into "the simulation reproduced the weird thing, and i can step into
the exact tick where it diverged."

**checkpoints, not reruns.** state snapshots and an append-only event
log mean a thousand-worldline experiment can resume, branch, and
diff — not restart. replay stops being a debugging chore and becomes a
research primitive: you can bisect a worldline the way you bisect a
crash.

**isolated failures.** agent actions are staged and validated before
they touch world state. a hallucinating agent fails loudly in its own
sandbox instead of corrupting the shared timeline. when you're running
a hundred worlds, you need failures to be *local*.

## what it makes possible

with determinism as the substrate, the workflow becomes:

1. pick a seed → get a worldline
2. vary one thing (a policy, a parameter, an agent) → get a *different*
   worldline
3. diff the two histories — **the divergence is the measurement**

small perturbations, amplified through the system, produce
macroscopically different outcomes. that's the butterfly effect, and
with worldlines it stops being a metaphor and becomes a variable you
can turn. the engine's job isn't to tell you which future is right —
it's to make the *space of possible futures* something you can
actually hold in your hands.
