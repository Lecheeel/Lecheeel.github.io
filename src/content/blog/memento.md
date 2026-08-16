---
title: "memento: turning phone notifications into an AI memory pipe"
description: "end-to-end encrypted notifications, shipped to your own server. the raw material for an AI that actually remembers."
pubDate: 2026-08-15
tags: ["android", "self-hosting", "crypto", "ai"]
---

## the problem

your phone knows what you actually do all day. your apps send you
notifications about it — payments, messages, reminders, delivery updates —
and that stream is a pretty honest diary of your life. but it's locked in a
silo: notification history is ephemeral, per-app, and nobody can query it.

so i built [memento](https://github.com/Lecheeel/memento): an android
notification collector that ships the stream to my own server, encrypted.

## the design

three decisions shaped everything:

**1. end-to-end encryption by default.** the server never sees plaintext on
the wire. every envelope is HMAC-SHA256 signed (with a timestamp and a
clock-skew check so replays fail), and the payload is AES-256-GCM encrypted
with a key only the phone and i know. the server is a dumb vault — it can
store, and it can check signatures, and that's it.

**2. the server is a single node.js file, zero dependencies.** no express,
no database, no docker. one `index.mjs`, a config file, and a directory of
JSONL files partitioned by package name and date. it runs on anything with
node ≥ 18 — a raspberry pi, an old laptop, a 1.6GB vps with 400MB free.
there's something nice about a server whose entire attack surface is one
file you've read end to end.

**3. one-line install, idempotent.** `curl … | sudo bash -s 49033` downloads
the server, generates pairing keys, writes a hardened systemd unit, and
self-checks. re-running it keeps your keys and data — only the code
updates. the install script was honestly harder to get right than the
server: piping a script that copies "its own directory" through stdin
doesn't work, because there is no directory. the fix was detecting
`BASH_SOURCE[0] == "-"` and fetching the server files from github instead.

## what i learned

- **notifications are ~38% duplicates.** same message re-posted, system
  noise, apps re-sending the same alert. any pipeline that consumes this
  data needs dedup before it needs anything else.
- **keys rotate, scripts lie.** the pairing secret got regenerated a few
  times during development, and every time i had to re-pair the phone.
  writing an installer that *preserves* existing keys on re-run was the
  difference between "one command" and "a ritual".
- **the interesting part is downstream.** a vault of encrypted JSONL is
  just storage. the actual product is what you do with it: filter noise,
  embed the keepers, and feed them to an LLM so your agent has a memory of
  what happened on your phone even when you never told it. that part is
  still being built.

## status

it works. notifications land on the server in real time, encrypted, and
the `/events` endpoint returns them. the "AI memory" half — daily summaries,
vector search over old notifications — is the next step, and the storage
format was designed for it from day one.
