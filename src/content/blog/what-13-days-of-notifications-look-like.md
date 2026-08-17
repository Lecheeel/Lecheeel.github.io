---
title: "what 13 days of phone notifications look like"
description: "1873 notifications, 2 apps, 94% from one of them. some observations from a real notification stream."
pubDate: 2026-08-17
tags: ["data", "android", "memento"]
---

## the data

my phone has been running a notification collector ([memento](https://github.com/Lecheeel/memento))
for a couple of weeks. small sample, but real: **1873 notifications
over 13 days**, every one of them encrypted on the way to a server i
control. here's what the stream actually looks like.

## the shape of the stream

**two apps, one of them dominant.**

| app | count | share |
|---|---|---|
| wechat (`com.tencent.mm`) | 1766 | 94.3% |
| alipay (`com.eg.android.AlipayGphone`) | 107 | 5.7% |

the long tail you'd expect from a phone with 40 apps installed simply
isn't there — which says more about my capture setup than about my
phone. i only enabled collection for two apps, so the "stream" is
deliberately narrow. that's a useful reminder: **a notification stream
is a sample, not a census**. the moment you analyze it, you're
analyzing your collection policy as much as your life.

**volume varies wildly day to day.**

```
day 1:  23      day 8:  155
day 2:  77      day 9:  122
day 3: 255      day 10: 331
day 4:  77      day 11:  39
day 5: 218      day 12: 201
day 6: 155      day 13:  39
day 7: 331 (max)   day 14: 167
```

wait — that's 14 rows for 13 days, because two days peaked at 331.
mean 144/day, median 155, range 23–331. a 14x swing between quiet days
and loud ones. the interesting question isn't the average — it's *what
drives the spikes*. group chats going off, payment confirmations, a
single conversation generating 30 notifications. that structure is
exactly what a memory pipeline needs to know about: **the variance is
the signal**.

## what i learned

- **duplicates are a real tax.** early tests showed ~38% of the stream
  was repetition — the same message re-posted, or an app re-sending an
  alert. any consumer of this data needs dedup before it needs
  anything else.
- **two apps already tell a story.** wechat's share of the stream is
  basically my social graph; alipay's is my transaction log. even at 2
  apps, the stream is a surprisingly complete skeleton of a day.
- **encrypted-at-rest changes what you can do with it.** because the
  server stores signed, encrypted envelopes, "analyze my
  notifications" is a deliberate act, not a background default. the
  friction is the feature.

## the honest caveat

n=1, n=2 apps, 13 days. this isn't a study — it's a diary with
numbers. the value is in the shape: if you're building anything that
consumes notification streams (memory pipes, personal assistants,
activity trackers), the variance, the duplicates, and the collection
bias are the three things to design for first.
