---
title: "Spoofing at the Source: Kernel-Level GNSS Position Forgery on Android"
description: "forging location where the data enters — a model of why kernel-level spoofing wins the GPS war and loses the physical one."
pubDate: 2026-08-19
tags: ["android", "gnss", "security", "research"]
---

location spoofing on android is conventionally a user-space problem:
hook `LocationManager`, forge NMEA streams, mask mock flags. every such
approach fights a detection stack it can see — and loses to the layers
it can't. this post walks through a fundamentally different attack
surface we've been modeling: **forging the position at the kernel
driver layer**, where data enters the HAL. three results stand out:

1. a kernel-level forgery that respects physical motion constraints
   makes the entire GPS path statistically indistinguishable from
   genuine data;
2. the residual detection surface is not technical but physical —
   cell/wi-fi fingerprints and server-side cross-validation survive
   any client-side forgery;
3. practical deployment is bimodal: legacy chardev SoCs are fully
   exploitable, while modern QMI/SLPI architectures need per-SoC
   engineering.

## why user-space spoofing loses

the android location stack is a pipeline, and commercial SDKs (AMap,
Baidu, Google fused location) consume it at *multiple* points at once:

```
GNSS chip → kernel driver → HAL process → JNI → Framework → SDK
                               ▲                    ▲
                     NMEA stream, raw GNSS     cell & wi-fi
                     measurements, sensors     fingerprints
```

Xposed/LSPosed tools hook the Java APIs at the top of this stack. that
leaves three classes of evidence intact:

- **binder-level calls** that bypass the hooked Java methods entirely;
- **native-side anti-hook detection** (inline-hook inspection of
  `ArtMethod`, zygisk/riru presence);
- **physical signals** — the cell towers and wi-fi access points your
  phone is really connected to, which the SDK's server cross-checks
  against a fingerprint database.

the pattern is always the same: the attacker wins the layers they can
see, and loses the layers they can't. so we moved the attack to the one
place where *everything above it* becomes consistent.

## the core idea: forge the source, not the stack

![spoofing architecture](/images/gnss-forgery-architecture.svg)

if the forgery happens at the driver boundary — a GKI kernel module,
loaded the way KernelSU loads modules, using kprobe to intercept the
driver's output — then every layer above it reads a **self-consistent
fake world**:

- the HAL process reads the driver as a black box and faithfully
  forwards whatever it gets;
- the JNI layer, `LocationManager`, and the SDK all see the same fake
  coordinates, the same fake NMEA stream, the same fake raw
  measurements — because they were all produced by the same fabricator.

each layer trusts the one below it, and the one below it is now yours.
there is no "inconsistency" to detect, because there is no second
source of truth left inside the device. the rust-binder precedent
(mainlined in Linux 6.18) and the `kernel` crate make a Rust
implementation of this module a realistic, well-trodden path.

## the first constraint: motion has to be plausible

a forged trajectory that teleports, or accelerates at 30 m/s², is dead
on arrival: any detector can flag it by comparing consecutive fixes.
formally, the forgery must stay inside the *feasibility region* defined
by bounded velocity and acceleration:

$$
\frac{\|\hat{p}(t+\tau) - \hat{p}(t)\|}{\tau} \le v_{\max}
\qquad\text{and}\qquad
\frac{\|\hat{v}(t+\tau) - \hat{v}(t)\|}{\tau} \le a_{\max}.
$$

two facts make this constraint a *solvable problem* rather than a
barrier:

- **it's convex.** clamping velocity and acceleration per sample is an
  $O(n)$ projection; a simple random-walk-with-clamps generates
  plausible trajectories trivially (Algorithm 1 below).
- **it's sufficient.** a motion-plausibility detector's decision rule is
  a function of velocity and acceleration alone. two trajectories that
  agree on those agree on everything the detector can see. kinematic
  consistency is not the hard part — which is exactly why user-space
  tools that teleport are sloppy, not why they fail.

```
Algorithm 1 — kinematic-consistent trajectory
  p ← anchor; v ← 0; a ← 0
  loop every dt:
    a ← clamp(sample_activity(), -a_max, a_max)
    v ← clamp(v + a·dt, -v_max, v_max)
    p ← p + v·dt
    if ‖p - anchor‖ > radius: v ← -v      # hover near target
```

## the real battle: multi-source detection

the interesting model is the detector's *ensemble*. each source has a
detection probability $p_i$ if left un-forged; assuming conditional
independence, the overall detection probability is

$$
P_{\text{det}} = 1 - \prod_{i \notin \mathcal{C}} (1 - p_i),
$$

where $\mathcal{C}$ is the set of sources the attacker covers. the
attacker's problem is budget-constrained: which sources to cover first?
because the log-detection-probability decomposes into a sum of
separable terms, the optimal policy is the greedy ratio rule — cover the
source with the largest $-\log(1-p_i)/c_i$ each step.

the source table is where the story lives:

| source | attackable at kernel level? | effect when covered |
|---|---|---|
| `LocationManager` output | yes — source is forged | $p \to 0$ |
| NMEA 0183 stream | yes — driver output forged | $p \to 0$ |
| raw GNSS measurements | yes, in principle | $p \to 0$ |
| sensor consistency | partial — via kinematic model | $p \to 0$ |
| **cell fingerprint** | **no — physical signal** | stays ~0.8 |
| **wi-fi fingerprint** | **no — physical signal** | stays ~0.8 |
| **server cross-validation** | **no — server authority** | stays ~0.95 |

with the GPS-path sources covered, the minimum attainable detection
probability is bounded by the three physical/institutional channels:

$$
\min P_{\text{det}} = 1 - (1-p_{\text{cell}})(1-p_{\text{wifi}})(1-p_{\text{server}})
\approx 0.998.
$$

*illustrative numbers, but the structure is the result:* **kernel-level
forgery wins the GPS war and loses the physical one.** the GPS path is
eliminable to an arbitrarily small probability; the cell/wi-fi/server
path floors detection at ~0.99 regardless of attacker sophistication.
that asymmetry is the entire strategic picture.

## platform reality: it's an ecosystem, not a module

the hook point differs by SoC generation:

| platform | GNSS channel | hook point | feasibility |
|---|---|---|---|
| legacy Qualcomm / MediaTek | chardev (`/dev/gnss`, `/dev/ttyMT*`) | driver `read()` via kprobe | high |
| modern Qualcomm (SM8350+) | QMI messages (modem-hosted GNSS) | QMI driver stack | moderate |
| SLPI/ADSP islands | cross-core communication | vendor-specific | low |

with rough population fractions (legacy ~0.4, modern qualcomm ~0.5,
slpi ~0.1), a *generic* module reaches about 65% of devices in
expectation; the rest requires per-SoC adapters. the engineering
conclusion is the same as every kernel project: the framework is
portable, the hook points are not. the highest-leverage investment for
full coverage is the QMI layer.

## sensitivity: what actually moves the numbers

| parameter | range | effect | takeaway |
|---|---|---|---|
| $v_{\max}$ | 1–40 m/s | none (GPS path) | kinematics is feasibility, not detection |
| $p_{\text{server}}$ | 0.7–0.99 | dominant term | server authority is the binding constraint |
| legacy share | 0.2–0.6 | coverage 0.45–0.85 | platform mix drives deployment value |
| QMI feasibility | 0.2–0.8 | coverage 0.50–0.80 | QMI engineering is the highest-leverage bet |

the qualitative conclusions are structurally robust: they depend on
*feasibility* (what a client can and cannot forge), not on parameter
values.

## what this means for defenders

the practical implication inverts conventional wisdom: hardening
`LocationManager`, NMEA listeners, or anti-hook checks inside the SDK is
wasted effort against a kernel-level attacker — everything in the
device is forgeable. the defenses that actually matter are:

1. **server-side fingerprint cross-validation** — the only channel with
   a floor that survives any client forgery;
2. **kernel integrity enforcement** — bootloader lockdown, GKI module
   signing, kprobe restrictions. the attack is won or lost at the boot
   chain, not in the SDK.

## limitations and honest caveats

- **model, not measurement.** the probabilities in the source table are
  estimates; nothing here is field-tested data. the structural claims
  (GPS path eliminable, physical path not) rest on feasibility
  arguments that are much safer than the point estimates.
- **assumption: the HAL is a black box.** a vendor HAL with a hardware
  side-channel (independently interrogating the chip) would break the
  "everything above is consistent" claim.
- **assumption: no multi-device statistical detection.** a server that
  sees the same device claim contradictory positions over time, or a
  cluster of devices sharing one fake trajectory, can flag at the
  semantic level — beyond any per-sample physical check.

## the dual use

the same architecture that enables forgery enables **validated replay**
for test labs: deterministic, replayable GNSS scenarios for testing
location-dependent apps without field hardware. that is the legitimate
application of this design, and the one i would build first.

the open question on the forgery side is the one the model identified:
server-side fingerprint verification. until a client-side actor can also
forge cell and wi-fi observations in a way that survives the server's
database, kernel-level forgery wins every battle inside the device and
loses the war against any detector that checks the physical world.
