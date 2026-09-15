# Jellyfin Media Server via Cloudflare Tunnel

**Date:** 2026-09-15  
**Status:** Design

## Goal

Expose Jellyfin media server at `media.chapter23.uk` using a named cloudflared tunnel. Access Jellyfin (running in Docker on Zeus/Orbstack) securely through Cloudflare's global network with a memorable domain name.

## Architecture

```
Browser → media.chapter23.uk
              ↓ (Cloudflare DNS CNAME)
        Cloudflare Edge
              ↓
        cloudflared tunnel (named: chapter23-jellyfin)
              ↓ (Tailscale mesh network)
        zeus.forest-pantone.ts.net:8096
              ↓
        Jellyfin Docker container (port 8096)
              ↓
        Media Library on Zeus
```

## Components

### 1. Named cloudflared tunnel
- **Tunnel name:** `chapter23-jellyfin`
- **Routes:** `media.chapter23.uk` → `http://zeus.forest-pantone.ts.net:8096`
- **Runs as:** LaunchAgent (macOS) or systemd user service (Linux)
- **Config file:** `~/.cloudflared/chapter23-jellyfin.yml`
- **Auto-starts:** Yes (configured in Task 5)

### 2. DNS record
- **CNAME:** `media.chapter23.uk` → `<tunnel-id>.cfargotunnel.com`
- **Created via:** `cloudflared tunnel route dns` (automatic)
- **Provider:** Cloudflare (managed for chapter23.uk zone)

### 3. Service address
- **Tailscale DNS:** `zeus.forest-pantone.ts.net:8096`
- **Why Tailscale:** 
  - Secure mesh network (encrypted)
  - Always available when Tailscale daemon is running
  - More reliable than IP addresses
  - Works across network changes

### 4. Jellyfin server
- **Deployment:** Docker container on Zeus (Orbstack)
- **Port:** 8096 (standard Jellyfin port)
- **Users:** Access via web interface at `https://media.chapter23.uk`

## Security considerations

- **HTTPS only:** Cloudflare tunnel enforces TLS; all traffic is encrypted end-to-end
- **Tailscale tunnel:** Connection from cloudflared to Jellyfin goes through Tailscale's encrypted mesh
- **No firewall rules needed:** Tunnel initiates outbound connections only
- **Automatic credential management:** Cloudflare manages tunnel authentication

## Network flow

1. User opens `https://media.chapter23.uk` in browser
2. Browser resolves DNS: `media.chapter23.uk` → `<tunnel-id>.cfargotunnel.com`
3. Browser connects to Cloudflare Edge
4. Cloudflare routes request through the tunnel
5. `cloudflared` daemon (running locally) receives the request
6. `cloudflared` connects to Zeus via Tailscale DNS: `zeus.forest-pantone.ts.net:8096`
7. Jellyfin processes the request and streams response back
8. Response flows back through tunnel to user's browser

## Implementation plan

See: `docs/superpowers/plans/2026-09-15-jellyfin-tunnel.md`

Tasks are organized in order:
1. Create tunnel
2. Write configuration
3. Route DNS
4. Test connectivity
5. Configure auto-start
6. Commit to repo

## What is NOT in scope

- Jellyfin user management (handled by Jellyfin itself)
- Media library setup (already on Zeus)
- DLNA/casting (Jellyfin native features)
- Automated backups of library metadata
- Load balancing across multiple Jellyfin instances

## Dependencies

- `cloudflared` CLI installed and authenticated
- Tailscale running (for `zeus.forest-pantone.ts.net` DNS resolution)
- Jellyfin Docker container running on Zeus
- Cloudflare zone configured for `chapter23.uk`
- LaunchAgent (macOS) or systemd (Linux) for auto-start

## Rollback plan

To disable Jellyfin tunneling:

**Stop the tunnel:**
```bash
# macOS
launchctl unload ~/Library/LaunchAgents/uk.chapter23.jellyfin-tunnel.plist

# Linux
systemctl --user stop chapter23-jellyfin-tunnel.service
systemctl --user disable chapter23-jellyfin-tunnel.service
```

**Keep or delete DNS record:**
```bash
# Keep CNAME (tunnel will be unreachable but DNS record stays)
# Delete CNAME if you want to reuse media.chapter23.uk for something else
cloudflared tunnel route dns chapter23-jellyfin media.chapter23.uk --remove  # (if command exists)
```

**Keep or delete tunnel:**
```bash
# Keep tunnel credentials for quick restart
# Delete everything if decommissioning
cloudflared tunnel delete chapter23-jellyfin  # (warning: this is permanent)
```

