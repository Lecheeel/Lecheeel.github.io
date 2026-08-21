---
title: "Building the Kernel-Level Location Forger: A Design Blueprint"
description: "the implementation blueprint behind the spoofing model — module, hook points, control channel, rust rationale, and the mvp path."
pubDate: 2026-08-20
tags: ["android", "kernel", "gnss", "rust", "design"]
---

this is the implementation companion to the previous post on
[modeling kernel-level GNSS forgery](/blog/kernel-level-gnss-spoofing-model/).
that one asked *why it works*; this one is *how to build it*. the
blueprint: a KernelSU-style GKI kernel module written in Rust, hooking
the GNSS driver's output, controlled by an app through a device node.

## the shape of the system

![blueprint](/images/location-forger-blueprint.svg)

two paths, one module:

- **control path**: app → `/dev/fakeloc` → module (set coordinates, mode)
- **data path**: module → driver output → HAL → Framework → SDK

everything above the hook point sees a self-consistent fake world,
because the fake data is born below all of them.

## component 1: the kernel module (KernelSU mechanics)

nothing new needs inventing here — KernelSU proved the whole chain:

- **load**: unlocked bootloader → `insmod` the GKI module (signed with
  a test key, exactly the KernelSU arrangement)
- **hook**: `kprobe`, the dynamic instrumentation mechanism that can
  hook *any* kernel symbol regardless of the GKI KMI surface — this is
  precisely why KernelSU works on stock GKI kernels
- **lifecycle**: `module_init` registers the kprobe and the device node;
  `module_exit` cleans both up

## component 2: the forgery point, by platform

**chardev SoCs (legacy Qualcomm / MediaTek) — the easy path:**

the GNSS chip is exposed as a character device (`/dev/gnss`,
`/dev/ttyMT*`). kprobe the driver's `file_operations.read`, and answer
every HAL read with generated NMEA instead of driver data:

- `GPGGA` — position, satellite count, HDOP
- `GPRMC` — speed, true course, UTC time, lock state
- `GPGSV` — satellite sky distribution

the three must agree with each other: if GPGGA says 8 satellites and
HDOP 1.2, GPGSV better list plausible satellites and GPRMC better give
consistent speed. the HAL parses whatever it reads; it never knows the
chip didn't say it.

**QMI SoCs (modern Snapdragon, SM8350+) — the real work:**

GNSS lives inside the modem; data arrives as QMI_LOC messages. the hook
moves into the QMI driver stack (message dispatch), and you forge
position *messages* instead of NMEA sentences. more complex — message
formats, transaction IDs — but same principle: the HAL reads what you
put there.

## component 3: the kinematic engine (inside the kernel)

teleporting is what gets user-space tools caught. the module runs a
tiny trajectory generator so the fake position moves like a body:

```
state: p, v, a
every tick (dt):
    a ← clamp(activity_sample(), ±a_max)     # walk 1.5, drive 30 m/s
    v ← clamp(v + a·dt, ±v_max)
    p ← p + v·dt
    if ‖p − anchor‖ > radius: v ← −v         # hover near target
```

velocity and acceleration limits are *detection thresholds* — keep the
fake inside them and motion-plausibility checks pass by construction.
the same engine feeds speed and heading into GPRMC, keeping NMEA
internally consistent. this is where rust earns its keep: no GC pauses,
no lock contention, tight numeric loops.

## component 4: the control channel

- module registers a **misc device** → `/dev/fakeloc`
- app → kernel: `write()` structured commands (coordinates, mode,
  enable), `ioctl()` for status
- kernel → app: `poll()` wakeups when module state changes
- permissions: node owned `root:system`, app accesses via root granted
  by KernelSU; SELinux gets a small policy addition (KernelSU ships the
  pattern)

## component 5: why Rust

- the `kernel` crate is stable and shared by all in-tree Rust code;
  the Android binder driver was rewritten in Rust and landed in
  mainline 6.18 — the platform is committed to this path
- a kernel module crash is a full reboot; Rust turns the memory-safety
  bug class into compile errors. for a module touching drivers and
  device nodes, that's the difference between a project and a hobby
- KernelSU itself is exploring rust modules; the ecosystem is forming

## component 6: the app

flutter (or kotlin, if you want less glue): map picker to set the
target, route mode (walk a path, not a point), a master switch, and a
status readout. writes to `/dev/fakeloc` through plain file IO —
nothing exotic on the userspace side, which is the point: all the
magic lives in the module.

## the full data flow

```
1. app picks (39.9042, 116.4074) → write /dev/fakeloc
2. module stores the target
3. any app requests location:
   HAL reads driver → kprobe intercepts → module emits NMEA
   (beijing, walking speed, 8 sats, hdop 1.2)
4. HAL parses → Framework → LocationManager → SDK
5. SDK's NMEA listener and raw-measurement hooks read the same
   fabricated source → consistent by construction
```

## decisions to make, questions to answer

| decision | direction | open question |
|---|---|---|
| chardev vs QMI first | chardev, then QMI | target device's driver path |
| NMEA self-consistency | single engine feeds all sentences | is satellite distribution ever checked? |
| time axis | forged NMEA time | compared against system clock? |
| sensor companion | static mode leaves sensors alone | does walking mode need fake steps? |
| cell/wi-fi | not forged (physical) | server cross-check remains the ceiling |
| module signing | KernelSU pattern | target bootloader state |

## the mvp path

```
phase 1 — prove it (1–2 weeks)
  one chardev device with an unlocked bootloader
  minimal rust module: kprobe read(), inject static NMEA
  app: hardcode coordinates to /dev/fakeloc
  accept: GPS status shows the fake position; amap/baidu move

phase 2 — make it real
  kinematic engine + route mode
  proper app (map pick, switch, status)
  QMI hook for modern SoCs

phase 3 — round it out
  cell/wi-fi companion layer (LSPosed for the soft parts)
  adversarial testing against amap-class SDKs
  open source, framed for its legitimate use: validated replay
```

## the honest risks

- **the server still wins.** cell/wi-fi fingerprints and position-history
  plausibility live beyond any client forgery — this was the conclusion
  of the [modeling post](/blog/kernel-level-gnss-spoofing-model/), and
  it doesn't change with better engineering.
- **unlocked bootloader is a hard requirement.** great for your own
  device, a wall for everyone else.
- **QMI/SLPI adaptation is an ecosystem, not a module.** expect
  per-SoC work.
- **GKI versions move.** follow the android release train or fall
  behind.
- **defenders adapt too.** kernel-integrity checks (module signatures,
  suspicious .ko detection) are the obvious next move for the SDKs that
  care.

## next step

phase 1, concretely: a chardev-based device with an unlocked bootloader,
the minimal rust module hooking the driver's `read()`, a static nmea
generator, and a hardcoded coordinate. the acceptance criterion is a
gps status readout showing the forged position and a consumer app
believing it. everything else in this blueprint is downstream of that
first test passing.
