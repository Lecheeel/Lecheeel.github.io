---
title: "Detecting watered-down AI API relays"
description: "Five measurable dimensions for checking whether a relay actually serves the model it claims: capability, knowledge cutoff, tool discipline, cache honesty, and billing ratio."
pubDate: 2026-08-16
tags: ["ai", "llm", "testing"]
---

API relay stations buy quota from model providers and resell it. Some of
them do not resell what they claim: a smaller model behind a flagship
label, stale checkpoints, inflated token counts, or cache hit rates that
no customer can verify. This note sketches how you would detect each
form of cheating, because I want to build a probe that does it
automatically.

## The detection dimensions

**1. Capability vs. claimed model.** Give the endpoint tasks the flagship
handles and known impostors fail at: long-context reasoning, multi-step
math, tool-call discipline. A swapped-in smaller model has a specific,
repeatable failure signature — it is not "slightly worse", it fails
particular categories outright.

**2. Knowledge cutoff.** Ask about dated events, one per year for the
last several years. Past its cutoff, a model guesses confidently and
dates things wrong. A handful of such questions brackets the cutoff
within a few months — enough to expose a model two generations old being
sold as the current one.

**3. Tool calling and document understanding.** Can it actually read a
provided PDF, or does it hallucinate the contents? Can it chain two tool
calls where the second depends on the first's output? Cost-cutting
substitutions typically fail here, because tool discipline is the first
thing cheaper models drop.

**4. Cache honesty.** Prompt caching has a measurable side effect: cached
requests are faster and cheaper. Probe it: send the same prefix
repeatedly and compare the reported cache hit rate against observed
latency. If the relay reports 90% hits but response time never drops,
the reported number is fabricated.

**5. The billing ratio.** The direct metric: what you were charged for a
fixed workload, versus what the upstream API would charge for the same
workload. Every other dimension diagnoses *how* you are being cheated;
this one measures *how much*.

## The sampling problem

The hard part is not the tests — it is that the relay controls the
sampling. You are measuring a box you cannot open, through a channel the
box's owner operates. So every probe has to look like ordinary traffic:
capability questions framed as normal use, cutoff questions as trivia,
cache probes as retries. If a relay can special-case your probe traffic,
the probe is worthless.

## What this would look like as a tool

A probe service, not a benchmark. Benchmarks compare models; this
compares a claim against observations. Input: endpoint URL, key, claimed
model. Output: a score per dimension and one summary statement — "this
endpoint charges 3.4x the upstream rate and behaves like a model two
generations old."

I am working on this. The open question is which dimensions survive
contact with relays that know the probe exists — the cache-honesty probe
in particular becomes an arms race once relays learn its signature.
