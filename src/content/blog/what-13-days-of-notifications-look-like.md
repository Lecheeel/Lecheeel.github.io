---
title: "What 13 days of phone notifications look like"
description: "Measured properties of a real notification stream: 1873 events, two apps, 94% concentration in one, 14x daily variance, ~38% duplicates."
pubDate: 2026-08-17
tags: ["data", "android", "memento"]
---

My phone has been running the [memento](/blog/memento/) collector for
about two weeks. The sample is small but real: 1873 notifications over
13 days, every one encrypted in transit and at rest. This note records
what the stream actually looks like, because anyone building on
notification streams should know these shapes before designing.

## Concentration

| app | count | share |
|---|---|---|
| WeChat (`com.tencent.mm`) | 1766 | 94.3% |
| Alipay (`com.eg.android.AlipayGphone`) | 107 | 5.7% |

Collection was enabled for exactly these two apps, so the concentration
is a property of the collection policy, not of the phone. That is itself
the first finding: **a notification stream is a sample, not a census** —
any analysis of it is also an analysis of what you chose to capture.

Within the two apps, the two streams mean different things: the WeChat
share is a social graph, the Alipay share is a transaction log. Two
apps already give a usable skeleton of a day.

## Daily variance

Daily counts, in order:

```
23  77  255  77  218  155  331  155  122  331  39  201  39  167
```

Mean 144/day, median 155, range 23–331 — a 14x swing between the
quietest and loudest days. The spikes are not noise: they are single
group conversations going active, or batches of payment confirmations.
For a memory pipeline this matters, because it means **the interesting
information is in the variance, not the average** — a system sized for
the mean will be idle most days and saturated exactly when something
worth remembering happens.

## Duplicates

Early tests measured ~38% of the stream as repetition: the same message
re-posted, apps re-sending the same alert, status updates for one
underlying event. Any consumer of this data needs dedup before
anything else — embedding and summarizing duplicates directly pollutes
whatever memory store sits downstream.

## Caveats

n=1 device, 2 apps, 13 days. This is a characterization of one stream,
not a population study. The transferable findings are structural:
collection policy defines the sample, daily variance spans an order of
magnitude, and roughly a third of the volume is duplicate. Design for
those three shapes and the specifics stop mattering.
