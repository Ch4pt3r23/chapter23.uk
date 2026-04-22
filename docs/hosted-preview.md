# Hosted Password-Protected Preview

`preview.chapter23.uk` should be a hosted Cloudflare Pages preview site, not a tunnel to whichever laptop is currently running Hugo.

## Target Setup

- Production stays on `main` and remains public at `https://chapter23.uk`.
- Draft work happens on a long-lived `preview` branch.
- Cloudflare Pages deploys the `preview` branch as a preview deployment.
- `preview.chapter23.uk` is handled by the `chapter23-preview-gate` Worker route.
- Cloudflare Pages Functions middleware requires HTTP Basic Auth for:
  - `preview.chapter23.uk`
  - any non-`main` Pages branch deployment
- The Worker also requires HTTP Basic Auth before proxying `preview.chapter23.uk` to `https://preview.chapter23.pages.dev`.

## Cloudflare Pages Settings

The Pages project appears to be `chapter23`.

1. In Cloudflare, open **Workers & Pages** > **chapter23**.
2. Confirm preview deployments are enabled for the `preview` branch.
3. Add these Pages environment variables for Preview deployments:

```text
PREVIEW_AUTH_USER=chapter23
PREVIEW_AUTH_PASSWORD=<choose a shared password>
```

Set `PREVIEW_AUTH_PASSWORD` as a secret if you use Wrangler.

## Cloudflare Worker Route

The `chapter23-preview-gate` Worker is deployed from `workers/preview-gate.js` and attached to:

```text
preview.chapter23.uk/*
```

It uses these bindings:

```text
PREVIEW_AUTH_USER=chapter23
PREVIEW_AUTH_PASSWORD=<same shared password>
PREVIEW_TARGET_ORIGIN=https://preview.chapter23.pages.dev
```

This route lets `preview.chapter23.uk` stay available even while the old DNS record still points through Cloudflare. The Worker intercepts the request at the edge, checks the password, then proxies the hosted Pages preview branch.

## Wrangler Equivalent

Wrangler needs `CLOUDFLARE_API_TOKEN` or an interactive `wrangler login` first.

```bash
npx wrangler pages secret put PREVIEW_AUTH_PASSWORD --project-name chapter23
```

`PREVIEW_AUTH_USER` can be set in the Cloudflare dashboard. If it is omitted, the middleware uses `chapter23`.

Deploy the Worker gate:

```bash
npx wrangler deploy workers/preview-gate.js \
  --name chapter23-preview-gate \
  --compatibility-date 2026-03-10 \
  --route 'preview.chapter23.uk/*' \
  --var PREVIEW_AUTH_USER:chapter23 \
  --var PREVIEW_TARGET_ORIGIN:https://preview.chapter23.pages.dev \
  --secrets-file .preview-secrets \
  --keep-vars
```

## Day-To-Day Workflow

```bash
git switch preview
git merge main
# edit posts/layouts
hugo --gc --minify
git add .
git commit -m "draft: update preview"
git push origin preview
```

After Cloudflare finishes the preview deployment, open `https://preview.chapter23.uk` and enter the preview credentials.

To publish:

```bash
git switch main
git merge preview
git push origin main
```

## Local Preview

The old `site-preview` helper is still useful for instant local Hugo feedback, but it should no longer be the source of truth for `preview.chapter23.uk`.
