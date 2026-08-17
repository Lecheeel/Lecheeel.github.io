---
title: "the env var that did nothing"
description: "i set a config flag, restarted the service, and nothing changed. the fix was reading the source."
pubDate: 2026-08-17
tags: ["debugging", "config", "linux"]
---

## the setup

my agent runs on feishu, and in group chats it only replied when
mentioned. i wanted to turn that off. the documentation said: set
`FEISHU_REQUIRE_MENTION=false`. i added it to the env file, restarted
the gateway, tested... and the group still required the mention.

## the investigation

three checks, in order:

**1. did the service actually restart?** yes — new pid, fresh start
time. not that.

**2. is the variable in the service's environment?** this was the
moment. i read the process environment directly:

```bash
tr '\0' '\n' < /proc/<pid>/environ | grep FEISHU
```

empty. the variable i'd set was **not there**. the env file i'd edited
was a secrets file that the gateway loads selectively — it never
injects everything into the process environment. the adapter reads
`os.getenv("FEISHU_REQUIRE_MENTION")`, which looks at the process
environment, which didn't have it. **the config was written to a file
nobody was reading for that key.**

**3. what does the adapter actually read?** the source said:

```python
extra.get("require_mention", os.getenv("FEISHU_REQUIRE_MENTION", "true"))
```

there it was: the config file's `extra` section wins, and the env var
is only a fallback. the fix was putting the flag where the code looks
first:

```yaml
platforms.feishu.extra.require_mention: false
```

restart, test, done.

## the lessons

- **"documented" and "wired" are different.** the docs mentioned the
  env var, but the env var was a fallback path that never fired in my
  setup. reading the actual read-site (`grep` the adapter source)
  resolved in minutes what docs-chasing wouldn't have.
- **verify at the boundary.** `/proc/<pid>/environ` tells you what a
  service *actually* has, not what you *think* you gave it. it's the
  fastest way to end a "why is my config not working" argument.
- **env files for secrets, config files for behavior.** this is now a
  rule: behavior flags go in the structured config, secrets go in the
  env file. mixing them is how you get a flag that exists in two places
  and works in neither.
