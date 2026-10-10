# Project Guide

## Architecture

This is a static website converted from user-supplied HTML. `public/index.html` contains the original dashboard markup, styles, and browser-side logic. `netlify.toml` publishes `public/` without a build step and adds basic response security headers. There is no package manager, framework, backend, or database.

## Conventions

Preserve the supplied branding and existing dashboard design. Prefer focused edits to the HTML rather than introducing a framework or replacing the interface. Never embed credentials or reintroduce the original password gate. Access is deliberately public at the owner's request.

## Behavior

The dashboard becomes visible immediately and initializes automatically. History analysis loads in the background. The browser retrieves history from the supplied external endpoint with existing CORS fallbacks; availability is outside this project's control. Session statistics reset on reload. Polls are scheduled after the preceding poll completes to avoid overlapping requests.

The profile is informational, not an authenticated account. Pattern analysis is heuristic browser-side code, not hosted AI inference. Keep the public notice explaining that results are not guaranteed. No bets or payments are processed.

## Deployment And Review

Netlify publishes `public/` directly. No compilation is needed. Follow the current task's validation restrictions and do not generate build artifacts. Product-owner handoff notes are in `.netlify/results.md`.
