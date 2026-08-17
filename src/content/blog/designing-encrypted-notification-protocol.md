---
title: "designing an encrypted notification protocol"
description: "what a phone-to-server notification pipe looks like when the server is assumed to be compromised."
pubDate: 2026-08-17
tags: ["crypto", "protocols", "android"]
---

## the threat model

the server that receives your phone's notifications is a box on the
internet. assume it gets owned: a bad package, an exposed port, a
forgotten dependency. if the server can decrypt what it stores, that's
your entire life — messages, payments, whereabouts — sitting in one
place, readable by whoever takes the box.

so the design goal for [memento](https://github.com/Lecheeel/memento)'s
pipe was simple: **the server must be able to store and validate
everything, and understand nothing.**

## the envelope

every notification travels inside an envelope with two layers:

**integrity first — HMAC-SHA256.** each envelope carries a signature
computed with the shared device token, over the payload plus a
timestamp. the server checks the signature and the clock skew
(±5 minutes) before it even looks at the payload. replay a captured
envelope tomorrow and the timestamp is stale — rejected. tamper with
one byte and the signature fails — rejected.

**confidentiality second — AES-256-GCM.** the payload itself is
encrypted with a separate key (the encryption secret), and GCM gives
authenticated encryption: the ciphertext can't be modified without
the tag failing. the server never holds this key — only the phone and
the human do.

the result is a server that can:

- verify *who* sent it (signature) and *when* (timestamp)
- store it, index it, return it
- and **never** tell you what any of it means

## the small decisions that matter

**64KB body cap.** a notification is small; a 64KB cap kills abuse and
keeps memory bounded on a 1.6GB server. cheap, invisible, correct.

**JSONL storage, partitioned by app and day.** one line per event, one
file per `<package>/<date>`. trivially appendable, trivially
grep-able, trivially rotated. a "database" that a shell script can
maintain is a database that won't surprise you at 2am.

**idempotent, key-preserving installs.** the pairing keys live in the
config; the installer re-runs must keep them or the phone and server
fall out of sync. this sounds like ops trivia until the day you lose
your phone's memory and have to re-pair it.

## the tradeoff i accepted

the phone encrypts with a key the server doesn't have — which means
**the server can't do anything smart with the data either**. no
server-side filtering, no search inside the encrypted payload. all
processing happens client-side or after a deliberate decrypt. that's
the point: smartness that requires plaintext is a decision you should
have to make on purpose, every time, not a default.

the pipe is boring on purpose. boring protocols survive.
