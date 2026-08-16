---
title: "detecting watered-down ai relays"
description: "if you resell an api, someone will water it down. here's how you'd catch them."
pubDate: 2026-08-16
tags: ["ai", "llm", "testing"]
---

## the problem

ai api relay stations are a business now: they buy quota from real
providers and resell it, usually at a markup, sometimes with "added
value". the problem is that not all of them resell what they claim to.
i kept hearing the same complaints:

- the model answers are *dumber* than the real one, but the label says
  the flagship. is it a smaller model wearing a name tag?
- it knows nothing after 2024. that's not a model limitation, that's a
  different model.
- the billed token count doesn't match the usage. every request, a
  little extra, so quiet nobody notices.
- and the interesting one: **cache hit rates that make no sense**. a
  relay that controls the cache layer can inflate what it reports,
  because the customer can't see the other side of the pipe.

## the detection dimensions

if you wanted to build a probe — a frontend where you drop in a url, a
key, pick a model, and get a score — here's what you'd measure:

**1. actual capability vs claimed model.** give it a task the flagship
is known to handle and the impostor is known to choke on: long-context
reasoning, tool-call discipline, math with many steps. the failure
signature of a swapped model is specific and repeatable.

**2. knowledge cutoff.** ask about events with known dates — after the
cutoff the model guesses confidently and gets the date wrong. one
question per year for the last five years is enough to bracket the
cutoff within a few months. old models are easy to spot; they're
confident and wrong in ways that have a date stamp on them.

**3. tool calling and file understanding.** can it actually read a pdf
you hand it, or does it hallucinate the contents? can it chain two tool
calls where the second depends on the first's output? relays that
shave costs by using weaker models fall apart here, because tool
discipline is exactly what cheap models skip.

**4. billing honesty.** the prompt cache has a public, measurable side
effect: cached responses are faster and cost a fraction. you can probe
it — same prefix, repeated calls — and compare the *reported* hit rate
against the *observed* latency. if the relay reports 90% hits but the
response time never drops, someone is lying about the cache.

**5. the multiplier.** the universal fraud metric: what did they charge
you for a request, versus what the upstream api would have charged for
the same request. run a fixed workload, compute the ratio. everything
else is theater; this number is the business.

## what i'd build

a small probe service, not a benchmark. benchmarks compare models; this
compares **claims against observations**. same input, fixed workload,
score per dimension, and a final number that says "this relay is charging
you 3.4x and giving you a model two generations old".

the hard part isn't the tests — it's that the relay controls the
sampling. you're measuring a box you can't see inside, through a straw.
so every test has to be one the relay can't special-case without
breaking something else: capability probes that look like normal
traffic, cutoff questions that look like trivia, cache probes that look
like retries. boring, indistinguishable, and brutally specific.

i'm building this. if you run a relay and this post makes you
uncomfortable, that's data too.
