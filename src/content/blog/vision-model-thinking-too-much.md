---
title: "your vision model is thinking too much"
description: "image analysis was taking 26 seconds. it wasn't the network. it was the model thinking out loud."
pubDate: 2026-08-17
tags: ["llm", "vision", "performance"]
---

## the symptom

i wired my agent's image analysis to a qwen model — the flagships are
multimodal now, and this one was fast on paper. then i sent it a photo
and waited. and waited. **26 seconds** for a description of a skyline.

first suspect was the network. it wasn't. second suspect was the image
size. also not it — the same photo analyzed fine in other tools.

## the measurement

i ran the same image through the same model twice, once with reasoning
explicitly disabled, once with defaults:

| mode | time | reasoning tokens |
|---|---|---|
| default | 14.8s | 655 |
| thinking off | **2.3s** | 0 |

6x faster, zero reasoning tokens, and the description quality was
identical. the model was spending most of its latency **thinking out
loud before answering** — an internal monologue nobody asked for.

## the root cause

the qwen flagship defaults to `enable_thinking: true`. my agent's image
pipeline never set it, so every image got a silent thinking session.
the fix was one line of config: `extra_body: { enable_thinking: false }`
for the vision task. after that, 2-3 seconds per image, forever.

## the general lesson

reasoning is a **per-task decision**, not a model property. for
code-generation and math, thinking is the whole point. for describing a
photo — a task where the answer is *in the input* — the internal
monologue is pure overhead: slower, more expensive, same output.

when a model feels slower than it should be, measure the reasoning
tokens. if the response includes a `reasoning_content` field and the
task doesn't need reasoning, you're paying for someone's private
thinking. turn it off.

worth noting: the same benchmark showed a vision-specific flash model
at 11.5s — faster still. i kept the flagship anyway, because 2.3s was
already fine and the flagship reads more context. the interesting
number wasn't which model won; it was what the default was silently
costing.
