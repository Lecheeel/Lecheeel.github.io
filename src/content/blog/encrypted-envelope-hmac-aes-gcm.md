---
title: "The encrypted envelope: HMAC-SHA256 and AES-256-GCM in a notification protocol"
description: "A notification pipe where the server stores everything and understands nothing. Each layer, key, and constant, and the reasoning behind it."
pubDate: 2026-08-17
tags: ["crypto", "protocols", "security"]
---

## the threat model first

before any design decision, write down what you're defending against.
for a phone→server notification pipe, the list is short and ugly:

| threat | example |
|---|---|
| eavesdropping | someone on the network reads the traffic |
| tampering | an attacker modifies a notification in transit |
| replay | a captured notification is re-sent later (a stale "payment received" is worse than no notification) |
| **server compromise** | the box you send everything to gets owned — and everything you ever sent is sitting there |

the last one is the one that changes the design. if the server is
assumed compromised, then **the server must not be able to read what it
stores**. that single assumption dictates the whole architecture:
encrypt end-to-end, sign everything, and make the server a vault that
can validate but never understand.

## the envelope

![the envelope](/images/envelope.svg)

three layers, built from the inside out:

1. **plaintext payload** — a small JSON document: device id, timestamp,
   app, title, text. capped at 64 KB.
2. **AES-256-GCM** — encrypts the payload into ciphertext. GCM is
   *authenticated* encryption: it provides confidentiality *and*
   integrity in one primitive.
3. **HMAC-SHA256** — signs the ciphertext *plus the timestamp*, using a
   separate key from the encryption key.

the server's entire job is: verify the signature (timing-safe), check
the timestamp window, and store the ciphertext. it never decrypts.

## layer 1: the signature, and what it covers

the first instinct is to sign the payload. the correct move is to sign
**the ciphertext plus the timestamp**, for two reasons:

**timestamp inside the MAC means replay dies with the clock.** if the
timestamp were only metadata, an attacker could strip the old timestamp
off a captured envelope and attach a fresh one — the signature still
validates (it was over the payload), and the server happily accepts a
week-old event. putting the timestamp inside the signed region makes
that impossible: the signer and the verifier agree on *when*, and
there's no field an attacker can touch without breaking the MAC.

**verify before you decrypt.** the server checks the HMAC first. bad
signature → reject, never touch the ciphertext. this isn't just
efficiency — decrypting untrusted ciphertext is exactly how padding
oracle attacks start. GCM's authentication tag makes them impractical
here, but the ordering is still the right habit: *authenticate
everything you can before you process anything you can't*.

### the clock-skew window is a real tradeoff

`allowedClockSkewMs: 300000` — five minutes. this constant deserves
more respect than it gets, because it's the entire replay window:

- **too tight** (30s): a phone with a drifted clock (no NTP, airplane
  mode, a dead RTC) gets every envelope rejected. support nightmare.
- **too loose** (an hour): a captured envelope stays replayable for an
  hour. for a *notification* pipe, that's mostly harmless — but the
  principle is the same at any scale.

five minutes is the sweet spot I settled on: tolerant of real-world
clock drift (which is usually seconds, occasionally minutes), and
bounded enough that a replayed envelope is stale before anyone cares.
the constant is a policy decision dressed up as a number — write it
down in the config, and make sure the config is versioned.

## layer 2: GCM, and the nonce that must never repeat

AES-GCM is the right choice here, and the reason is architectural:
**it's authenticated encryption (AEAD)**. confidentiality and integrity
are one primitive, one key schedule, one tag. the alternative —
encrypt-then-MAC with two separate mechanisms — is where real-world
protocols die: people forget the MAC, MAC the wrong bytes, or reuse a
nonce across the two primitives in ways that cancel each other out.
GCM removes the entire class of "I encrypted but forgot to authenticate"
bugs by making it impossible to have one without the other.

but GCM has one unforgiving rule: **a nonce must never be reused under
the same key.** GCM's forgery resistance degrades catastrophically on
nonce reuse — an attacker who sees two messages with the same nonce can
recover the GHASH key and forge *arbitrary* ciphertext. this is not a
theoretical footnote; it's the reason GCM implementations warn you to
generate nonces with a counter, not with `random()`.

in practice, for a phone that sends a handful of envelopes a day, a
96-bit random nonce has collision odds that are comfortably
astronomical. but "comfortably" is doing a lot of work: the correct
answer is a **per-device counter** — deterministic, impossible to
collide, and trivially auditable. if I rebuild this pipe, that's the
one change I'd make: random nonces now, counter nonces forever.

## layer 3: the comparison that must not leak

this is the detail most people skip, and it's the one I want to
highlight, because it's where amateur implementations leak secrets
without anyone noticing.

verifying an HMAC means comparing two digests. in almost every language,
the naive comparison is a **short-circuiting byte-by-byte loop**:

```js
// what everyone writes first
function unsafeEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
```

the problem: the loop **returns early on the first mismatching byte**.
an attacker can submit a guess, measure how long the comparison took,
and learn *how many prefix bytes were correct*. that's a byte-at-a-time
oracle — with enough measurements, the attacker reconstructs the valid
MAC for arbitrary messages. timing attacks are real, they're
automated, and they don't need your server to be fast; they need it to
be *slightly slower on correct prefixes*.

the fix is constant-time comparison: always read every byte, accumulate
the difference, and return a single boolean at the end:

```js
const { timingSafeEqual } = require('node:crypto');

// lengths must match first — but that's a fast reject on structure,
// not on content, so it leaks nothing about the digest itself
const a = Buffer.from(received);
const b = Buffer.from(computed);
const ok = a.length === b.length && timingSafeEqual(a, b);
```

`timingSafeEqual` XORs every byte and never branches on the result.
the time to verify a bad signature is now identical to the time to
verify a good one — the oracle closes. node gives you this in the
standard library, which is the other half of the lesson: **for crypto
primitives, use the platform's implementation, never your own.**

## why two keys

the pipe uses two secrets: `deviceToken` for the HMAC, `encryptionSecret`
for the AES. this separation is deliberate, and it's a smaller version
of the same instinct that splits TLS keys into separate handshake and
traffic keys:

- **compromise scoping.** if the HMAC key leaks (say, a debug log
  prints it), the attacker can forge envelopes — but they still can't
  *read* anything. the stored data stays ciphertext. the blast radius
  is "garbage in", not "everything out".
- **rotation independence.** rotate the signing key without re-encrypting
  anything (the ciphertext is keyed by the other secret), and vice
  versa. two keys, two rotation schedules, two failure modes.

a single shared secret would be simpler. it would also be the kind of
simplicity that turns a lost key into a data breach.

## the edges that keep it boring

- **64 KB cap.** notifications are small; a cap bounds memory on a
  1.6GB server and kills the "use the ingest endpoint as a dumpster"
  attack. cheap, invisible, correct.
- **idempotent, key-preserving installs.** the pairing keys live in the
  server config; a re-run of the installer must keep them, or the phone
  and server silently fall out of sync. the installer being boring is a
  security property.
- **JSONL, partitioned by app and day.** one line per envelope, one
  file per `<package>/<date>`. append-only, grep-able, trivially
  rotated. a "database" a shell script can maintain is a database that
  won't surprise you at 2am.

## what I'd tell my past self

1. **write the threat model first** — it's the only thing that stops
   you from adding crypto you don't need or skipping what you do.
2. **never assemble your own crypto**, but *do* assemble the protocol:
   the primitives (HMAC, GCM, timing-safe compare) are standard; the
   interesting work is in how they compose, what gets signed, and what
   order things happen in.
3. **every constant is a policy** — the 5-minute skew window, the 64KB
   cap, the key split. document them like code, because they are code.
4. **test the attacks, not the happy path.** replay an old envelope and
   watch it die. flip one byte of the ciphertext and watch the tag
   fail. run the phone with a wrong clock and watch the skew check
   fire.

what's still open: nonce generation is random-per-message, which is safe
at this message rate but not auditable — a per-device counter is the
next change. and the whole scheme inherits the phone's key storage as
its root of trust, which on a compromised device is weaker than the
math above suggests.
