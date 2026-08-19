---
title: "Spoofing at the Source: A Multi-Layer Adversarial Model for Kernel-Level GNSS Position Forgery on Android"
description: "a mathematical treatment of spoofing GPS at the driver layer: kinematic consistency, multi-source detection games, and the information-theoretic boundary that survives."
pubDate: 2026-08-19
tags: ["modeling", "android", "gnss", "security", "research"]
---

## Summary

Location spoofing on Android is conventionally a user-space problem:
hooking `LocationManager`, forging NMEA streams, masking mock flags. Every
such approach fights a detection stack it can see, and loses to the layers
it cannot. This paper formalizes a fundamentally different attack surface —
**forging the position at the kernel driver layer**, where the data enters
the HAL, and asks two questions under adversarial assumptions:

1. **Given control of the kernel, can a forged position be made
   statistically indistinguishable from a genuine one across the entire
   Android location stack?**
2. **What is the residual detection surface that no kernel-level forgery
   can eliminate?**

We develop three coupled models. Model I formalizes the *kinematic
consistency* constraint: a forged trajectory must satisfy bounded velocity
and acceleration to survive motion-plausibility checks; we derive the
feasibility region and show that any trajectory inside it is
indistinguishable from genuine motion at the sensor level. Model II
formulates the *multi-source detection game*: a detector ensemble
{GPS, NMEA, raw GNSS measurements, cell fingerprint, Wi-Fi fingerprint,
server-side fingerprint verification} with per-source detection
probabilities, and computes the optimal source-coverage strategy for the
attacker under a cost budget. Model III captures *platform heterogeneity*:
the hook-feasibility of GNSS data channels (chardev, QMI, SLPI) across SoC
architectures, yielding the coverage ratio of a deployment.

Our analysis yields three principal results. (i) A kernel-level forgery
that respects kinematic constraints reduces the GPS-path detection
probability to an arbitrarily small value in theory, bounded in practice
by the residual fault rate of the kernel hook itself. (ii) The dominant
residual risk is **server-side fingerprint verification**: cell and Wi-Fi
observations are physical signals the attacker cannot forge without
compromising the network stack, giving the detector a detection
probability that converges to 1 as the fingerprint database ages. (iii)
Platform coverage is bimodal: chardev-based SoCs are fully exploitable
(~0.4 of the Android population, legacy), while QMI/SLPI architectures
require substantially deeper hook points, capping the practical attack
surface. We conclude with a decision framework: kernel-level forgery is
the correct *maximal* attack surface for GPS-path spoofing, and the
server-side fingerprint channel is the information-theoretic boundary of
all client-side spoofing.

**Keywords**: GNSS spoofing; Android kernel; adversarial modeling;
location security; GKI; kprobe

---

## 1. Introduction

### 1.1 Background

The Android location stack is a pipeline: GNSS chip → kernel driver →
HAL process → JNI → Framework (`LocationManager`) → application SDK.
Commercial location SDKs (AMap, Baidu, Google Fused Location) consume
this pipeline at multiple points simultaneously: the `Location` object,
the raw NMEA 0183 stream (`addNmeaListener`), cell-tower observations
(`TelephonyManager`), Wi-Fi scans (`WifiManager`), and — critically —
server-side fingerprint databases that cross-validate the client's
observations against physical signal maps.

Existing spoofing tools operate at the top of this stack. Developer-option
mock locations are trivially detected via `isFromMockProvider()`.
Xposed/LSPosed modules hook the Java APIs, but leave three classes of
evidence intact: (a) Binder-level calls that bypass the hooked Java
methods, (b) native-side anti-hook detection (ArtMethod inline-hook
inspection, zygisk/riru presence), and (c) the physical signals that the
server cross-checks. The adversarial state of the art is therefore a
losing battle at every layer the attacker can see — because the layers
they cannot see keep reporting the truth.

### 1.2 Problem Restatement

We model the following adversarial setting:

- **Attacker**: controls the kernel (via a GKI kernel module, in the
  style of KernelSU's kprobe-based dynamic hooking), with full control
  over data flowing from the driver to the HAL, and a control channel
  to a userspace application.
- **Detector**: controls the HAL, the Framework, and the server, with
  access to a multi-source observation ensemble and an evolving
  fingerprint database.

Under these assumptions we seek: (P1) the optimal forgery strategy that
minimizes detection probability; (P2) the residual detection surface
that cannot be eliminated by any kernel-level forgery; (P3) the
feasibility region of such a system across the Android platform
landscape.

### 1.3 Contributions

1. A formal model of *kinematic consistency* for forged trajectories,
   with an explicit feasibility region.
2. A *multi-source detection game* with an optimal coverage algorithm.
3. A *platform coverage model* for hook-feasible GNSS channels.
4. A decision framework separating the attackable from the
   information-theoretically unattackable.

---

## 2. Assumptions

We state our assumptions explicitly, per the modeling discipline:

1. **A1 (Kernel control)**: The attacker can load a kernel module into a
   GKI kernel (bootloader unlocked, `insmod` of a signed or test-signed
   module) and can kprobe arbitrary kernel symbols including the GNSS
   driver's file operations or QMI message handlers.
2. **A2 (Driver fidelity)**: The HAL process reads the driver as a black
   box; it does not independently interrogate the hardware.
3. **A3 (Detection ensembles)**: The detector observes the seven sources
   in Table 1, with per-source detection probabilities assumed stationary
   within a model run.
4. **A4 (Kinematic bounds)**: Physical motion satisfies bounded velocity
   and acceleration; detection thresholds are known (or estimable) to the
   attacker.
5. **A5 (No physical compromise)**: The attacker cannot forge
   radio-frequency signals (cell/Wi-Fi emissions); these remain genuine
   physical observations.
6. **A6 (Server authority)**: The server's fingerprint database is
   accurate and not attacker-controlled.
7. **A7 (Single-device scope)**: We model single-device spoofing, not
   collusion or multi-device statistical attacks.

---

## 3. Notation and System Model

**Notation.**

| Symbol | Meaning |
|---|---|
| $p(t)$, $v(t)$, $a(t)$ | true position, velocity, acceleration at time $t$ |
| $\hat{p}(t)$ | forged position trajectory |
| $v_{\max}, a_{\max}$ | kinematic detection thresholds |
| $\mathcal{D}$ | detection source ensemble, $\|\mathcal{D}\|=7$ |
| $d_i \in \mathcal{D}$ | individual detection source |
| $p_i$ | detection probability of source $d_i$ (given forgery) |
| $\mathcal{C} \subseteq \mathcal{D}$ | source set covered (forged) by attacker |
| $c_i$ | cost of covering source $d_i$ |
| $B$ | attacker's coverage budget |
| $P_{\text{det}}$ | overall detection probability |
| $\theta_k$ | platform-type fraction (chardev/QMI/SLPI) |
| $h_k$ | hook feasibility of platform type $k$ |

**System architecture (data-flow view).**

```
GNSS chip (ground truth)
   └─► kernel driver ──[MODULE: forgery point]──► HAL process
        ──► JNI ──► Framework (LocationManager) ──► SDK
                              ▲
   detectors: NMEA stream, raw measurements (GnssMeasurements),
              cell (TelephonyManager), Wi-Fi (WifiManager)
                              ▲
              server-side fingerprint cross-validation (network)
```

---

## 4. Model I: Kinematic Consistency of Forged Trajectories

### 4.1 Motion-plausibility detection

A detector can compare the forged trajectory $\hat{p}(t)$ against
physical plausibility: finite velocity and acceleration, and continuity
of both. Let the detector flag the trajectory if, over any window
$[t, t+\tau]$,

$$\frac{\|\hat{p}(t+\tau) - \hat{p}(t)\|}{\tau} > v_{\max}
\quad\text{or}\quad
\frac{\| \hat{v}(t+\tau) - \hat{v}(t)\|}{\tau} > a_{\max}.$$

### 4.2 Feasibility region

We define the feasibility region $\mathcal{F}$ as the set of trajectories
satisfying the constraints for all $t$:

$$\mathcal{F} = \left\{ \hat{p}(\cdot) : \|\dot{\hat{p}}(t)\| \le v_{\max}, \;
\|\ddot{\hat{p}}(t)\| \le a_{\max} \; \forall t \right\}.$$

**Proposition 1.** For any $\hat{p} \in \mathcal{F}$, a motion-plausibility
detector with thresholds $(v_{\max}, a_{\max})$ cannot distinguish
$\hat{p}$ from any genuine trajectory $\hat{p}' \in \mathcal{F}$ solely
by kinematic evidence.

*Proof sketch.* The detector's decision rule is a function of
$\dot{\hat{p}}$ and $\ddot{\hat{p}}$ alone. Two trajectories identical in
position, velocity, and acceleration at every sample are
indistinguishable under this rule; since the constraints define the only
evidence available, membership in $\mathcal{F}$ suffices for
indistinguishability. $\blacksquare$

**Corollary 1.** The *generation* problem reduces to: sample a genuine
trajectory model (random walk with bounded increments, or a Markov model
over activity states) and project it onto $\mathcal{F}$. Standard
projection is a convex constraint satisfaction problem, solvable in
$O(n)$ per sample via clamp-and-continue.

### 4.3 Sensor cross-check

If the detector additionally compares displacement against inertial
sensors (pedestrian dead reckoning), the constraint tightens to
$\| \int_{t}^{t+\tau} \hat{a}(s) ds - \Delta \hat{v} \| \le \epsilon$;
we treat this as a strict sub-case of $\mathcal{F}$ with tighter
$a_{\max}$. The conclusion is unchanged: **kinematic constraints are
satisfiable, not a barrier.**

---

## 5. Model II: The Multi-Source Detection Game

### 5.1 Detection ensemble

The detector's sources and their attackability:

| $d_i$ | Source | Attackable at kernel level? | Baseline $p_i$ (uncovered) |
|---|---|---|---|
| 1 | `LocationManager` output | yes (source is forged) | ~0.9 |
| 2 | NMEA 0183 stream | yes (driver output forged) | ~0.7 |
| 3 | Raw GNSS measurements | yes, in principle | ~0.6 |
| 4 | Cell fingerprint (TelephonyManager) | **no** (physical signal) | ~0.8 |
| 5 | Wi-Fi fingerprint (WifiManager) | **no** (physical signal) | ~0.8 |
| 6 | Sensor consistency | partial (via kinematic model) | ~0.4 |
| 7 | Server-side cross-validation | **no** (server authority) | ~0.95 |

### 5.2 Independence and composition

Assuming conditional independence of sources given the true state,

$$P_{\text{det}} = 1 - \prod_{i \notin \mathcal{C}} (1 - p_i).$$

The attacker chooses $\mathcal{C} \subseteq \mathcal{D}$ to minimize
$P_{\text{det}}$ subject to $\sum_{i \in \mathcal{C}} c_i \le B$.

**Proposition 2 (Optimal coverage is greedy).** For costs $c_i \ge 0$ and
per-source elimination (covered sources contribute $p_i \to 0$), the
budget-constrained minimization of $P_{\text{det}}$ is solved by
repeatedly covering the source with the largest marginal
$-\log(1-p_i)/c_i$ ratio.

*Proof sketch.* $\log P_{\text{det}} = \sum_{i \notin \mathcal{C}}
\log(1-p_i)$, a sum of separable concave terms; the greedy ratio
criterion is optimal for this separable structure. $\blacksquare$

### 5.3 Numerical illustration

Let $B$ be normalized so that covering sources $\{1,2,6\}$ (GPS-path
plus sensor consistency) costs 3 units, while sources $\{4,5,7\}$
(cell, Wi-Fi, server) cost 5 units each and are, per A5–A6,
*uncoverable* — they are removed from $\mathcal{C}$ by feasibility, not
budget. Then:

$$\min P_{\text{det}} = 1 - \prod_{i \in \{4,5,7\}} (1 - p_i)
\approx 1 - (0.2)(0.2)(0.05) = 0.998.$$

*Illustrative values; the qualitative conclusion is robust:*

**Result 1.** The GPS-path detection probability can be driven to ~0,
**but** the cell/Wi-Fi/server residual dominates: $P_{\text{det}} \ge
0.99$ in every configuration where the physical channels are not
compromised. Kernel-level forgery wins the GPS war and loses the
physical war — exactly the layer boundary predicted by A5–A6.

---

## 6. Model III: Platform Coverage

### 6.1 Channel taxonomy

| Platform type $k$ | GNSS channel | Hook point | Feasibility $h_k$ |
|---|---|---|---|
| Legacy Qualcomm / MediaTek | chardev (`/dev/gnss`, `/dev/ttyMT*`) | driver `read()` via kprobe | high (0.95) |
| Modern Qualcomm (SM8350+) | QMI messages (modem-hosted GNSS) | QMI driver stack | moderate (0.5) |
| SLPI/ADSP islands | cross-core communication | vendor-specific | low (0.2) |

### 6.2 Coverage ratio

With platform fractions $\theta_k$ (estimates: legacy 0.4, modern
Qualcomm 0.5, SLPI 0.1) and independence,

$$C = \sum_k \theta_k h_k \approx 0.4(0.95) + 0.5(0.5) + 0.1(0.2) = 0.65.$$

**Result 2.** A deployment without per-SoC engineering reaches ~65% of
the device population in expectation; full coverage requires a
per-platform hook adapter, i.e., an ecosystem, not a single module.

---

## 7. Solution Algorithm

**Algorithm 1: Kinematic-consistent trajectory generation.**
```
Input: target anchor p*, duration T, thresholds v_max, a_max, sampling dt
Output: trajectory {p̂(t_k)}
1  initialize p̂(t_0) = p*, v = 0, a = 0
2  for k = 1 .. T/dt:
3      a_target ← activity-model sample (walk/drive/stop)
4      a ← clamp(a_target, [-a_max, a_max])
5      v ← clamp(v + a·dt, [-v_max, v_max])
6      p̂(t_k) ← p̂(t_{k-1}) + v·dt
7      if ‖p̂(t_k) − anchor‖ > radius: reflect v (stay near anchor)
8  return {p̂(t_k)}
```

**Algorithm 2: Source-coverage decision.**
```
Input: {p_i}, {c_i}, budget B, uncoverable set U
Output: coverage set C
1  C ← ∅ ; remaining ← B
2  while remaining > 0:
3      i* ← argmax_{i ∉ C∪U} −log(1−p_i)/c_i
4      if c_{i*} > remaining: break
5      C ← C ∪ {i*} ; remaining ← remaining − c_{i*}
6  return C
```

---

## 8. Sensitivity Analysis

| Parameter | Range tested | Effect on $P_{\text{det}}$ / coverage | Interpretation |
|---|---|---|---|
| $v_{\max}$ | 1–40 m/s | none (GPS path) | kinematic constraints are feasibility, not detection |
| $p_7$ (server) | 0.7–0.99 | dominant term | server authority is the binding constraint |
| $\theta_{\text{legacy}}$ | 0.2–0.6 | $C$: 0.45–0.85 | platform mix dominates deployment value |
| $h_{\text{QMI}}$ | 0.2–0.8 | $C$: 0.50–0.80 | QMI engineering is the highest-leverage investment |
| clock-skew window | ±1–10 min | none (GPS path) | replay bound orthogonal to kinematic forgery |

*Sensitivity is computed on the model, not measured empirically;
parameter ranges reflect the design space, not field data.*

**Key robustness finding.** The conclusions — (i) GPS-path elimination,
(ii) server-side dominance, (iii) platform bimodality — are stable across
the entire tested parameter ranges. The model is structurally robust:
the residual detection surface is determined by feasibility (A5–A6), not
by parameter values.

---

## 9. Model Evaluation

**Strengths.** (i) The three models are separable and independently
testable. (ii) Proposition 2 gives an exact, implementable coverage
policy. (iii) The feasibility analysis explains *why* prior user-space
tools fail: they operate inside the GPS path, where detection is
structural, while the physical channels remain uncovered.

**Limitations.** (i) Assumption A2 (driver fidelity) fails if a vendor
HAL independently interrogates hardware via a side channel. (ii) The
independence assumption in §5.2 ignores correlated detectors (a forged
NMEA stream and forged Location output share the same fabrication
process; a clever detector can exploit the correlation). (iii) No
empirical measurements accompany the numerical illustrations — they
are model outputs, not field data. (iv) A7 excludes multi-device
statistical detection.

**Threats to validity.** The single largest threat is the emergence of
*server-side behavioral models* (position-history plausibility,
device-fingerprint consistency), which attack the trajectory at the
semantic level, beyond any per-sample physical check. We treat this as
future work in §10.

---

## 10. Conclusion

We modeled kernel-level GNSS position forgery as a three-layer
adversarial problem. The findings are:

1. **Feasibility.** Kernel-level forgery at the driver↔HAL boundary
   makes the entire GPS path (Location, NMEA, raw measurements)
   statistically indistinguishable from genuine data, *provided* the
   forged trajectory respects kinematic constraints — a convex,
   implementable requirement (Proposition 1, Algorithm 1).
2. **Boundary.** The residual detection surface is not technical but
   physical and institutional: cell/Wi-Fi fingerprints and server-side
   cross-validation cannot be forged by any client-side actor
   (Result 1). The minimum attainable detection probability is bounded
   below by these channels (~0.99 in our illustration), independent of
   attacker sophistication.
3. **Ecosystem.** Practical deployment is bimodal (Result 2): ~65% of
   devices are reachable with generic engineering; the remainder
   requires per-SoC QMI/SLPI adapters.

**Practical implication.** For defenders, the conclusion inverts the
conventional wisdom: hardening `LocationManager`, NMEA listeners, or
anti-hook checks in the app layer is wasted effort against a
kernel-level attacker. The only robust defenses are (a) server-side
fingerprint cross-validation, and (b) kernel-integrity enforcement
(bootloader lockdown, GKI module signing, kprobe restrictions) — i.e.,
the attack is won or lost at the boot chain, not in the SDK.

**Future work.** (i) Relaxing A2/A6 toward side-channel HALs and
behavioral server models; (ii) correlated-detector analysis for the
independence assumption; (iii) an empirical validation harness on
chardev devices; (iv) the dual-use question: the same architecture that
enables forgery also enables *validated replay* for test labs, which we
believe is the legitimate application of this design.

---

## References

1. tiann. *KernelSU: A Kernel based root solution for Android*.
   https://github.com/tiann/KernelSU
2. Android Open Source Project. *Generic Kernel Image (GKI) project*.
   https://source.android.com/docs/core/architecture/kernel/generic-kernel-image
3. Android Open Source Project. *Configure kernel features as GKI modules*.
   https://source.android.com/docs/core/architecture/kernel/convert-or-add
4. Android Developers. *Raw GNSS Measurements*.
   https://developer.android.com/develop/sensors-and-location/sensors/gnss
5. *Android Binder Driver — Rust for Linux*.
   https://rust-for-linux.com/android-binder-driver
6. Rust for Linux. *The kernel crate*.
   https://rust.docs.kernel.org/kernel/
7. AOSP. *LocationManager / addNmeaListener API reference*.
   https://developer.android.com/reference/android/location/LocationManager
8. Linux Kernel Documentation. *Kprobe-based Event Tracing*.
   https://www.kernel.org/doc/html/latest/trace/kprobetrace.html
9. Qualcomm. *QMI (Qualcomm MSM Interface) protocol documentation*.
   https://docs.qualcomm.com/
10. bigsinger. *fakegps — Xposed-based location spoofing module* (prior art).
    https://github.com/bigsinger/fakegps
