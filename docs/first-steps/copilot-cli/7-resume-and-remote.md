---
title: "Lesson 7 - Resume and go remote"
description: "Leave a Copilot CLI session and come back to it later with copilot --resume or /resume, and optionally continue it on GitHub with /remote."
authors:
  - jamesmontemagno
lastUpdated: 2026-09-28
---

Sessions can be paused without losing their conversation or workspace context. Leave a session, return to it later, and optionally continue it somewhere you can reach from any device.

In this lesson, you will:

- exit a session and resume it from the terminal.
- switch between sessions without leaving the CLI.
- optionally continue a session remotely.

## Leave a session and come back later

1. Exit the current Copilot CLI session when you are ready to switch tasks.
2. From a terminal, run `copilot --resume` to pick a previous session.
3. Inside Copilot CLI, use `/resume` to switch between sessions without leaving the CLI.
4. Confirm that the restored session still has the expected files, issue context, and model.

## Optional: Continue a session remotely

Suppose you are deep in one of these sessions and want to keep it going after you close your laptop. Run `/remote` to continue *that same session* on GitHub, then select the link it returns to open and browse the session in your browser.

> [!NOTE]
> `/remote` is not delegation, and it is not required for this workshop. Try it once the local loop feels natural.

## Summary and next steps

You can pause, resume, and continue sessions wherever you work. Continue to [Lesson 8: Create, review, and merge from the CLI][next-lesson].

[next-lesson]: ../8-pull-request/
