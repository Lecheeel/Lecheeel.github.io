---
title: "the gateway died when ssh dropped"
description: "a systemd user service, an ssh session, and the lesson about linger."
pubDate: 2026-08-16
tags: ["linux", "systemd", "self-hosting"]
---

## the symptom

my agent gateway ran as a `systemd --user` service. it had been up for
days. then i closed the laptop, walked away, and when i came back the
gateway was dead. `systemctl --user status` said the unit was active, but
nothing responded. the machine was fine — ssh worked, memory was fine,
no oom-killer entries. the service just wasn't there.

## the hunt

i checked the obvious things first:

- `journalctl --user -u gateway` — the last log line was *before* i
  closed the laptop. nothing after. no crash, no error. it just stopped
  logging.
- the process table — no gateway process. the unit claimed `active`,
  but there was no pid. classic zombie unit state.

that combination — "unit says active, process gone, no error" — meant the
process was killed by something outside systemd's knowledge. which is
exactly what happens when the **session** dies.

## the root cause

`systemd --user` services live inside your login session. when you log
out — or in my case, when the ssh connection that owned the session
dropped — systemd tears down the user manager, and every service in it
goes with it. the unit file survives, so `systemctl status` shows
"active" from the last-known state, but the actual process is gone.

the fix is one flag:

```bash
sudo loginctl enable-linger <user>
```

with linger enabled, the user manager starts at boot and stays alive
after every session closes. the service runs whether or not anyone is
logged in. that's the entire difference between "a thing that runs" and
"a thing that runs until you look away".

## the lesson

anything you want to survive an ssh disconnect needs one of two things:

- **linger**, for user services, or
- a **system-level** service (`/etc/systemd/system`), which never had
  this problem in the first place.

i now run the gateway as a system service with `Restart=always`. it has
survived ssh drops, reboots, and one accidental `shutdown -r`. the
turning point was understanding that "active" in systemd means "the unit
manager thinks it should be running", not "it is running". those are two
very different claims.
