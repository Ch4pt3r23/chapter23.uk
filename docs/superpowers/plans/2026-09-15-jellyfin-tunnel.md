# Jellyfin Media Server via Cloudflare Tunnel

> **For agentic workers:** Use this plan to set up media.chapter23.uk → Jellyfin via cloudflared tunnel.

**Goal:** Expose Jellyfin at `media.chapter23.uk` via a named cloudflared tunnel, routing to Jellyfin running in Docker on Zeus (Orbstack).

**Architecture:**
```
Browser → media.chapter23.uk
              ↓ (DNS CNAME → tunnel ingress)
        cloudflared tunnel (named: chapter23-jellyfin)
              ↓
        zeus.forest-pantone.ts.net:8096 (Tailscale DNS)
              ↓
        Jellyfin Docker container (port 8096)
              ↓
        Zeus (Orbstack)
```

**Tech Stack:** cloudflared, Jellyfin (Docker), Tailscale DNS

---

## Task 1: Create the cloudflared tunnel

- [ ] **Step 1: Create the named tunnel**

```bash
cloudflared tunnel create chapter23-jellyfin
```

Expected output:
```
Tunnel credentials written to /Users/chapter23/.cloudflared/<uuid>.json
Created tunnel chapter23-jellyfin with id <uuid>
```

Note the UUID — you'll need it in Task 2.

- [ ] **Step 2: Verify tunnel was created**

```bash
cloudflared tunnel list
```

Expected: `chapter23-jellyfin` appears in the list.

---

## Task 2: Write the tunnel config

**File:** `~/.cloudflared/chapter23-jellyfin.yml`

- [ ] **Step 1: Get the tunnel UUID**

```bash
cloudflared tunnel list | grep chapter23-jellyfin
```

Copy the UUID.

- [ ] **Step 2: Write the config file**

Replace `<UUID>` with the actual tunnel UUID:

```bash
cat > ~/.cloudflared/chapter23-jellyfin.yml << 'EOF'
tunnel: <UUID>
credentials-file: /Users/chapter23/.cloudflared/<UUID>.json

ingress:
  - hostname: media.chapter23.uk
    service: http://zeus.forest-pantone.ts.net:8096
  - service: http_status:404
EOF
```

- [ ] **Step 3: Verify the config**

```bash
cat ~/.cloudflared/chapter23-jellyfin.yml
```

Confirm:
- `tunnel:` shows the UUID
- `credentials-file:` path exists
- `service:` points to `http://zeus.forest-pantone.ts.net:8096`

---

## Task 3: Route DNS

- [ ] **Step 1: Create the DNS route**

```bash
cloudflared tunnel route dns chapter23-jellyfin media.chapter23.uk
```

Expected output:
```
Added CNAME media.chapter23.uk which will route to this tunnel tunnelID=<uuid>
```

- [ ] **Step 2: Verify DNS record**

```bash
dig media.chapter23.uk CNAME +short
```

Expected: `<uuid>.cfargotunnel.com.`

---

## Task 4: Test the tunnel

- [ ] **Step 1: Start the tunnel manually**

```bash
cloudflared tunnel run --config ~/.cloudflared/chapter23-jellyfin.yml chapter23-jellyfin
```

- [ ] **Step 2: Verify Jellyfin is reachable**

Open `https://media.chapter23.uk` in a browser.

Expected: Jellyfin login page or dashboard appears.

- [ ] **Step 3: Test playback**

Log in and start playing a media item to verify streaming works.

- [ ] **Step 4: Stop the tunnel**

Press `Ctrl+C` in the terminal.

---

## Task 5: Create auto-start service (optional)

**Choose based on your OS:**

### macOS (LaunchAgent)

**File:** `~/Library/LaunchAgents/uk.chapter23.jellyfin-tunnel.plist`

- [ ] **Step 1: Create the LaunchAgents directory**

```bash
mkdir -p ~/Library/LaunchAgents
```

- [ ] **Step 2: Write the plist**

```bash
cat > ~/Library/LaunchAgents/uk.chapter23.jellyfin-tunnel.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>uk.chapter23.jellyfin-tunnel</string>
    <key>ProgramArguments</key>
    <array>
      <string>/opt/homebrew/bin/cloudflared</string>
      <string>tunnel</string>
      <string>--config</string>
      <string>/Users/chapter23/.cloudflared/chapter23-jellyfin.yml</string>
      <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
      <key>SuccessfulExit</key>
      <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/chapter23-jellyfin-tunnel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/chapter23-jellyfin-tunnel.err.log</string>
    <key>ThrottleInterval</key>
    <integer>5</integer>
  </dict>
</plist>
EOF
```

- [ ] **Step 3: Load the agent**

```bash
launchctl load ~/Library/LaunchAgents/uk.chapter23.jellyfin-tunnel.plist
```

- [ ] **Step 4: Verify it's running**

```bash
launchctl list | grep jellyfin
ps aux | grep cloudflared | grep chapter23-jellyfin | grep -v grep
```

- [ ] **Step 5: Check logs**

```bash
tail -f /tmp/chapter23-jellyfin-tunnel.log
```

### Linux/Orbstack (systemd user service)

**File:** `~/.config/systemd/user/chapter23-jellyfin-tunnel.service`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p ~/.config/systemd/user
```

- [ ] **Step 2: Write the service file**

```bash
cat > ~/.config/systemd/user/chapter23-jellyfin-tunnel.service << 'EOF'
[Unit]
Description=Cloudflared Tunnel for Jellyfin
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/chapter23/.cloudflared/chapter23-jellyfin.yml run
Restart=always
RestartSec=5

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
```

- [ ] **Step 3: Enable and start the service**

```bash
systemctl --user daemon-reload
systemctl --user enable chapter23-jellyfin-tunnel.service
systemctl --user start chapter23-jellyfin-tunnel.service
```

- [ ] **Step 4: Verify it's running**

```bash
systemctl --user status chapter23-jellyfin-tunnel.service
journalctl --user -u chapter23-jellyfin-tunnel.service -f
```

---

## Task 6: Commit to repo

- [ ] **Step 1: Add documentation**

```bash
cd ~/dev/chapter23.uk
git add docs/superpowers/plans/2026-09-15-jellyfin-tunnel.md
git add docs/superpowers/specs/  # (if creating a spec doc)
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add Jellyfin tunnel setup plan for media.chapter23.uk"
git push origin claude/jellyfin-credentials-3o4q91
```

---

## Troubleshooting

**Tunnel won't connect:**
- Check Tailscale is running: `tailscale status`
- Test DNS resolution: `nslookup zeus.forest-pantone.ts.net`
- Verify Jellyfin is running: `docker ps | grep jellyfin`

**Slow streaming:**
- Tailscale mesh is optimized for this; check your local network bandwidth
- Consider enabling Jellyfin's transcoding if direct play is slow

**DNS not updating:**
- May take 30 seconds; run `dig media.chapter23.uk CNAME +short` to check
- Flush DNS cache if needed: `sudo dscacheutil -flushcache` (macOS)

