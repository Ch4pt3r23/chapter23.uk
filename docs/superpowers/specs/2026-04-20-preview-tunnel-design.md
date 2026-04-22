# Preview Site via Cloudflare Tunnel

**Date:** 2026-04-20  
**Status:** Superseded by `docs/hosted-preview.md`

## Goal

Expose a local `hugo server` instance at `preview.chapter23.uk` using a named cloudflared tunnel. Changes to content or layout are visible immediately at the preview URL with no deploy step. When the work is ready to publish, build with `hugo` and push to `main` — Cloudflare Pages handles the live site.

This design was useful for single-machine local preview, but it is no longer the preferred setup because `preview.chapter23.uk` depends on one laptop being online. Use the hosted, password-protected Cloudflare Pages preview flow in `docs/hosted-preview.md` instead.

## Architecture

```
Browser → preview.chapter23.uk
              ↓ (DNS CNAME → tunnel ingress)
        cloudflared tunnel (named: chapter23-preview)
              ↓
        localhost:1313
              ↓
        hugo server (tmux session: hugo-preview)
              ↓
        ~/dev/chapter23.uk/
```

## Components

### 1. Named cloudflared tunnel
- Tunnel name: `chapter23-preview`
- Routes `preview.chapter23.uk` → `http://localhost:1313`
- Runs as a launchd service so it survives reboots
- Config file at `~/.cloudflared/config.yml`

### 2. DNS record
- CNAME `preview.chapter23.uk` → `<tunnel-id>.cfargotunnel.com`
- Created via `cloudflared tunnel route dns` (automatic)

### 3. Hugo server
- Runs in a persistent tmux session (`hugo-preview`)
- Started with `hugo server --bind 0.0.0.0 --baseURL https://preview.chapter23.uk`
- Live-reloads on file changes

### 4. Publish workflow
- When ready: `hugo --minify` + `git add . && git commit && git push origin main`
- Cloudflare Pages auto-deploys from `main`

## What is NOT in scope
- Authentication/password protection on the preview URL (public)
- Automated publish command (manual for now)
- Branch-based deployments
