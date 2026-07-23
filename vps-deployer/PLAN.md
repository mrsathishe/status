# vps-deployer — Implementation Plan

> Status: **DRAFT — awaiting clarification.** This captures the idea so the next
> session can start. Details below are proposals, not final decisions.

## Goal (one sentence)

A self-hosted, Vercel-style **click-to-deploy** website: paste a GitHub repo URL,
press a button, and the app clones it onto the shared VPS, runs the standard
setup/deploy flow, and serves it on its own domain — all following
[`VPS_PROJECT_PLAYBOOK.md`](./VPS_PROJECT_PLAYBOOK.md).

## What it automates (from the playbook)

The whole point is to turn the manual playbook steps into one button:

1. **Clone** the given GitHub repo into `~/<project>` on the VPS.
2. **Allocate a free port** from the registry (verify with `ss -ltnp`).
3. **Run `npm run setup`** — install deps, build, generate + start the systemd unit.
4. **Write the nginx server block** for the project's domain and reload nginx.
5. **Issue HTTPS** via certbot for the domain.
6. Report **status/logs** (`systemctl status`, `journalctl`) back to the UI.

## Proposed architecture (matches the `status` project pattern)

- **Static frontend** (`index.html` + `js/` + `css/`) — form to enter repo URL,
  domain, and stack type; a "Deploy" button; a live status/log panel.
- **Express API** (`api/server.js`) — endpoints that shell out to the playbook
  steps. Runs as a systemd service on its own `127.0.0.1:PORT`.
- **`deploy/`** — the same four files (`setup.sh`, `deploy.sh`, `*.service`,
  `nginx.conf`) so this app itself deploys via the playbook.

### Sketch of API endpoints
- `POST /api/deploy` — `{ repoUrl, domain, port?, stack }` → kicks off clone + setup.
- `GET  /api/projects` — list managed projects + their status.
- `GET  /api/logs/:project` — stream `journalctl` output.
- `POST /api/redeploy/:project` — `git pull` + `npm run deploy`.

## Open questions (to resolve before building)

1. **Auth** — who can trigger a deploy? (single admin password / token / none for now?)
2. **Port + domain assignment** — auto-pick, or user supplies each time?
3. **Which stacks** to support first — Next.js, plain Node/Express, static only?
4. **How the API runs privileged commands** — it needs `sudo` for systemd, nginx,
   certbot. Restricted sudoers entries? Run the service as root? (security tradeoff)
5. **Persisting the project/port registry** — flat JSON file, SQLite, or the
   existing DB used by `status`?
6. **Secrets/`.env` handling** for deployed projects — how does the user provide them?

## Next steps

- [ ] Answer the open questions above.
- [ ] Scaffold `api/` (Express) + static frontend mirroring the `status` project.
- [ ] Copy `deploy/` from `status`, set a new port + domain.
- [ ] Implement `POST /api/deploy` wrapping the playbook steps end to end.
