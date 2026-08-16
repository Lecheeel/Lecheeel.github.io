---
title: "running a personal agent on a 1.6GB vps"
description: "a gateway, a search engine, a vector db, and one agent — with 400MB of headroom."
pubDate: 2026-08-16
tags: ["self-hosting", "linux", "vps", "ai"]
---

## the machine

a 1.6GB vps. one core, 40GB disk, debian. it runs:

- a gateway that connects me to my agent over feishu and wechat
- a searxng instance as the search backend
- a qdrant server for vector memory
- a node ingest server (see the [memento post](/blog/memento/))
- xray, because the network here requires it

at idle it has ~400MB free. the whole point of the exercise: how much
personal infrastructure can you run on hardware that costs less than a
coffee a month. the answer is "a surprising amount, if you're careful".

## the things that tried to kill it

**long sessions eat memory.** a conversation with 400+ messages pushed the
gateway's resident set to ~700MB, and free memory dropped to ~150MB. at
that point even `python3 -c "print(1)"` felt risky. the fix was boring and
effective: cap what gets kept in context, and stop spawning heavy helper
processes for trivial queries — a single curl beats a python process when
you're counting megabytes.

**cron jobs can hang the gateway.** a scheduled task that shells out to
the gateway's own CLI deadlocks on a lock the running gateway holds. the
first time it happened, the session froze mid-sentence. the rule now: the
gateway never runs its own admin commands, ever. log files exist for a
reason.

**there's always a surprise.** a safety guard in the terminal tool
crashed with `ValueError: embedded null byte` on certain scanned commands —
a genuine bug, worked around by routing those commands through the python
executor instead. small machines find these bugs for you, because every
failure is visible when you only have 400MB.

## what actually matters

after months of running this thing, the lessons are not about memory tuning:

1. **free software, self-hosted, beats paid, hosted, for my use case.**
   the cost isn't the hardware, it's the attention. an agent that lives on
   my own box and never phones home is worth the occasional 2am
   `systemctl restart`.

2. **measure before you optimize.** the fix for "memory pressure" was
   knowing which process ate it, which was a five-second
   `systemctl status` away.

3. **the 1% of problems you can't reproduce are the ones worth writing
   down.** this post exists because of them.
