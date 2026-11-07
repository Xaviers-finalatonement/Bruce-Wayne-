# The studio

A small private site for posting the videos by hand: download, thumbnail, title, caption, hashtags, and a step-by-step queue. Node 22, no dependencies, no build.

## Run locally

```
STUDIO_PASSWORD=choose-one npm start
```

Then open http://localhost:8080 (any username, your password). Without `STUDIO_PASSWORD` it only listens on 127.0.0.1 and prints a warning.

Settings (environment variables): `STUDIO_PASSWORD`, `PORT` (default 8080), `DATA_DIR` (default `studio/data/state`, where approvals and posted dates are saved).

## Put it online with Railway (from your phone)

1. Create an account at railway.com and sign in with GitHub.
2. Tap New Project.
3. Tap Deploy from GitHub repo.
4. Pick this repo and the branch `claude/charming-bell-j61a42`.
5. Open the Variables page.
6. Add `STUDIO_PASSWORD` and type your own password there. Never send it in chat.
7. Add a Volume and mount it at `/data`.
8. Add the variable `DATA_DIR` with the value `/data`.
9. Open Settings, then Networking.
10. Tap Generate Domain.
11. Open the domain and log in (any username, your password).

Check Railway's pricing page for the current free allowance.

Short videos live in `channels/*/out/` in the repo, so they must be committed to appear on the hosted site.
Long videos (compilations, `channels/*/compilations/cNN/out/`) are several hundred MB and git-ignored: the page shows "built locally, not uploaded yet" until the mp4 is on the server's disk. See `engine/COMPILE.md`.
