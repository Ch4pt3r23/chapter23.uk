# Hosted Password-Protected Preview

`preview.chapter23.uk` should be a hosted Cloudflare Pages preview site, not a tunnel to whichever laptop is currently running Hugo.

## Target Setup

- Production stays on `main` and remains public at `https://chapter23.uk`.
- Draft work happens on a long-lived `preview` branch.
- Cloudflare Pages deploys the `preview` branch as a preview deployment.
- `preview.chapter23.uk` is attached to the `preview` branch.
- Cloudflare Pages Functions middleware requires HTTP Basic Auth for:
  - `preview.chapter23.uk`
  - any non-`main` Pages branch deployment

## Cloudflare Pages Settings

The Pages project appears to be `chapter23`.

1. In Cloudflare, open **Workers & Pages** > **chapter23**.
2. Confirm preview deployments are enabled for the `preview` branch.
3. Add `preview.chapter23.uk` as a custom domain for the `preview` branch.
4. Remove or replace the old tunnel DNS route for `preview.chapter23.uk`.
5. Add these Pages environment variables for Preview deployments:

```text
PREVIEW_AUTH_USER=chapter23
PREVIEW_AUTH_PASSWORD=<choose a shared password>
```

Set `PREVIEW_AUTH_PASSWORD` as a secret if you use Wrangler.

## Wrangler Equivalent

Wrangler needs `CLOUDFLARE_API_TOKEN` or an interactive `wrangler login` first.

```bash
npx wrangler pages secret put PREVIEW_AUTH_PASSWORD --project-name chapter23
```

`PREVIEW_AUTH_USER` can be set in the Cloudflare dashboard. If it is omitted, the middleware uses `chapter23`.

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
