---
title: "FSRS v6 in Reme: porting a memory model to a study app"
description: "How my exam-prep app schedules reviews: the power-law forgetting curve, difficulty-stability state, the exact update rules, and two deliberate departures from the textbook algorithm."
pubDate: 2026-08-26
tags: ["algorithms", "flutter", "memory", "reme"]
---

Reme is the spaced-repetition app I built for my own exam preparation
(Chinese postgraduate entrance exam, politics question bank). Its
scheduler is a from-scratch Dart port of
[FSRS v6.1.1](https://github.com/open-spaced-repetition/fsrs4anki) —
the open-source algorithm that has been beating Anki's classic SM-2 in
benchmark after benchmark. This note documents what the algorithm
actually computes, how the port is verified against the reference
implementation, and the two places where I deliberately deviate from it.

## The memory model

FSRS models each card's memory as three numbers:

- **R** (retrievability) — the probability you can recall the card right
  now. Starts at 1 after a review and decays.
- **S** (stability) — how many days it takes for R to fall from 1.0 to
  0.9. Higher stability = slower forgetting.
- **D** (difficulty) — a 1–10 scale describing how hard the card is for
  you. Difficulty changes slowly; stability is where all the action is.

The decay is a power law, not SM-2's fixed interval multiplier:

$$
R(t, S) = \left(1 + \text{factor} \cdot \frac{t}{S}\right)^{\text{decay}},
\qquad
\text{decay} = -w_{20},\quad
\text{factor} = 0.9^{1/\text{decay}} - 1
$$

with `requestRetention` fixed at 0.9 by default. The whole curve family
is one function parameterized by S — that is the model's central idea:

![Forgetting curves for different stability values](/images/fsrs-forgetting-curves.svg)

The next review interval is defined as *where the curve crosses R = 0.90*,
inverted algebraically:

$$
I(S) = \frac{S}{\text{factor}} \left(0.9^{1/\text{decay}} - 1\right)
$$

So "stability" is not an abstraction — it is literally the number of days
until recall probability drops to your target retention.

## The update rules

Every rating updates D and S through closed-form formulas driven by 21
weights (`w[0]…w[20]`, shipped as defaults, optimizable per-user later).

**Difficulty** moves by a rating-dependent step, damped near the ceiling,
then pulled toward a mean-reversion anchor:

$$
D' = w_7 \cdot D_0(\text{Easy}) + (1 - w_7)\cdot\left(D + \Delta_D\cdot\frac{10 - D}{9}\right),
\quad \Delta_D = -w_6\,(g - 3)
$$

where g is the rating index (1=Again … 4=Easy). The damping term
`(10 − D)/9` slows increases as difficulty approaches 10, so a card can
stay hard without becoming impossible.

**Stability after successful recall** multiplies the old stability by a
growth factor depending on difficulty, current stability, elapsed-time
retrievability, and the rating:

$$
S' = S\cdot\Big(1 + e^{w_8}(11 - D)\,S^{-w_9}\big(e^{(1-R)w_{10}} - 1\big)\cdot\mathbb{1}_{\text{hard}}\cdot\mathbb{1}_{\text{easy}}\Big)
$$

Three properties fall out of this formula, and they are what make FSRS
behave sensibly:

- `(11 − D)` — easy cards grow stability faster than hard ones;
- `S^(-w9)` — growth is multiplicative but *decelerating*, so intervals
  stretch rather than explode;
- `(e^((1−R)w10) − 1)` — reviewing *early* (high R) barely helps;
  reviewing *at the point of nearly forgetting* (low R) is what builds
  stability. The algorithm prices in desirable difficulty.

**Stability after a lapse** is computed by a separate formula and capped
at a floor proportional to the old stability:

$$
S'_{\text{forget}} = \min\!\Big(w_{11}D^{-w_{12}}\big((S{+}1)^{w_{13}}-1\big)e^{(1-R)w_{14}},\;\; S/e^{w_{17}w_{18}}\Big)
$$

A forgotten card does not reset to zero — it keeps some fraction of its
stability, so relearning is faster than first learning. That matches the
empirical "savings" effect from the memory literature.

## What this looks like in practice

Running the actual weights used in Reme, a new card rated Good on every
review evolves like this:

![Interval growth over consecutive Good ratings](/images/fsrs-interval-growth.svg)

2 days → 11 → 46 → 163 → 496 → 1340 → 3272 (about nine years). Seven
successful reviews take a card effectively out of rotation. A single
Again, though, collapses stability back to days — the asymmetry between
the recall and lapse formulas is the entire behavioral profile of the
algorithm.

## Verifying a from-scratch port

Porting numeric code is easy; *knowing the port is right* is the hard
part. Two mechanisms in Reme handle this:

1. **Golden-value tests.** A small JS script runs the official
   `fsrs4anki_scheduler.js` v6.1.1 pure functions and dumps expected
   D/S/R values into `fsrs_golden_test.dart`. The Dart port must match
   them to ±0.01. Example cases: a new card rated Again must produce
   D=6.41, S=0.21; a review-state card with D=3, S=3 after exactly 1 day
   must compute retrievability R=0.957336.
2. **Deterministic fuzz seeds.** FSRS applies a ±5% random "fuzz" to
   intervals so many cards due the same day spread out. Instead of a
   global RNG, Reme hashes the question ID into a per-card seed
   (`seed = h(questionId)`), so the fuzz is deterministic: the same card
   always gets the same offset, and test expectations never flake.

Interval ordering is also enforced as a post-condition: after computing
all four outcomes, the scheduler clamps Hard ≤ Good ≤ Easy with strictly
increasing steps. This guards against edge cases where the raw formulas
produce inverted intervals for extreme states.

## Two deliberate departures

The port follows the reference implementation numerically, but the app
layer deviates in two places, both tuned for exam prep rather than
lifelong knowledge:

**1. First-pass mastery at 25 days.** In standard FSRS, a new card rated
Good gets whatever the initial stability formula says (about 2 days with
default weights). But a multiple-choice politics question answered
correctly on the *first encounter* is qualitatively different from one
that survived a review cycle: either you know it or you guessed well.
Reme schedules first-attempt correct answers straight to S = 25 days
(13 for a hesitant "Hard"), skipping the short-interval churn. Wrong-on-
first-attempt cards go through normal FSRS scheduling with in-session
repetition until mastered.

**2. Daily quota instead of infinite queue.** Classic SRS wisdom says
"reviews are always due-first and never truncated." For a student with a
syllabus and a deadline, that advice produces backlogs that kill
motivation. Reme introduces new questions under a daily cap
(`new_daily_cap`) inside a daily target, so workload stays flat even
when hundreds of cards come due after a break. Due reviews still come
first; the cap governs only new-card introduction.

Both deviations are visible in the review log (events tagged
`scheduled_review` vs `session_practice`), which matters for the next
step.

## Open problems

- **Personal optimization.** The 21 weights ship as population defaults.
  FSRS ships an optimizer that fits them to your own review log once you
  have enough data. My review ledger already records before/after state
  per event, so running the optimizer on my own data is a planned step —
  and worth a follow-up post when there are enough samples.
- **First-pass mastery vs. the optimizer.** The 25-day override injects
  synthetic stability values the optimizer will see as outliers.
  Reconciling the custom policy with data-driven weight fitting is an
  open design question.
- **Exam-date awareness.** The scheduler optimizes long-term retention;
  an exam on a fixed date should shift the target retention upward as
  the date approaches. Not implemented yet.
