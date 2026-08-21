---
title: "Memento: an end-to-end encrypted notification pipeline"
description: "Design notes on a phone-to-server notification collector: encryption choices, storage format, and the install problem that turned out harder than the server."
pubDate: 2026-08-15
tags: ["android", "self-hosting", "crypto", "ai"]
---

Memento ([github.com/Lecheeel/memento](https://github.com/Lecheeel/memento))
is an Android notification collector that ships notifications to my own
server, encrypted end-to-end. The long-term goal is to give an agent a
memory of what happens on the phone without giving the server readable
access to any of it. This note records the design decisions.

## The problem

A phone's notification stream is a fairly honest log of the day —
payments, messages, reminders, delivery updates — but it is ephemeral,
per-app, and not queryable. The Android notification history API keeps a
short window and exposes nothing to third parties. So the first step of
any "AI memory of the phone" project is simply getting the stream out,
with some control over who can read it.

## Design decisions

**1. End-to-end encryption, by default.** Every envelope is signed with
HMAC-SHA256 (timestamp included, with a bounded clock-skew window to
reject replays) and encrypted with AES-256-GCM under a key that only the
phone and I hold. The server stores ciphertext and verifies signatures;
it never decrypts. The detailed protocol is written up in
[the envelope post](/blog/encrypted-envelope-hmac-aes-gcm/).

**2. The server is one dependency-free Node.js file.** No Express, no
database, no Docker — one `index.mjs`, a config file, and JSONL files
partitioned by package name and date. It runs on anything with Node ≥ 18.
A server whose entire codebase fits in one read-through file has a much
smaller attack surface, and a much smaller maintenance surface, than a
"proper" service would.

**3. One-line install, idempotent.** `curl … | sudo bash -s 49033`
downloads the server, generates pairing keys, writes a hardened systemd
unit, and self-checks. Re-running it preserves keys and data — only the
code is replaced. This turned out to be harder to get right than the
server itself: a piped script has no "own directory" to copy files from,
so the installer detects `BASH_SOURCE[0] == "-"` and fetches the server
files from GitHub instead. Key preservation on reinstall was the
difference between a one-command setup and a re-pairing ritual.

## Measured properties of the stream

- **~38% of notifications are duplicates.** The same message re-posted,
  apps re-sending the same alert. Any downstream consumer needs dedup
  before anything else.
- **Storage partitioning matters for retrieval.** Partitioning by
  package and date keeps daily files small and makes time-range queries
  a file read, not a scan.
- **The collector is deliberately narrow.** I enabled collection for two
  apps (WeChat, Alipay) to keep the data meaningful. A notification
  stream is a sample defined by your collection policy, not a census.

## What is not done

The vault works: notifications land encrypted, the `/events` endpoint
returns them. The consumption side — filtering noise, embedding the
useful ones, feeding summaries into agent memory — is the part still
under design. The storage format (append-only JSONL, per-package
partitioning) was chosen to make that step cheap when it happens.
