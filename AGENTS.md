# YouTubeCast - Agent Instructions

## Quick Start

```bash
nix develop                    # Enter dev shell (bun, node, typescript, eslint, prettier)
nix build .#youtubecast        # Build package (outputs to result/)
nix run .                      # Run the app
```

## Commands

- `bun run start` — run backend (Bun on port 3001, behind nginx)
- `bun run build` — build frontend (writes to root-level `static/`)
- `bun run lint` — typecheck + prettier check + eslint (must pass before committing)
- `bun run prettier` — format everything

## Architecture

- **Backend**: Bun + TypeScript (Hono) in `src/` — entrypoint `src/index.ts`, routes in `src/router.ts`
- **Frontend**: React + Vite + Tailwind (v4) in `ui/` — builds to root-level `static/`
- **Nix**: `flake.nix` orchestrates builds; `modules/youtubecast.nix` is the backend derivation; `modules/default.nix` is the NixOS service module
- **Two bun dependency sets**: `modules/bun-root.nix` (backend), `modules/bun-frontend.nix` (frontend)
- **Output**: `result/app/` (source + node_modules + static), `result/bin/youtubecast-start` (wrapper script)

## Gotchas

- **Do NOT use `bun pm migrate`** — the Nix build uses `bun2nix.fetchBunDeps` which bypasses bun's lockfile migration. If you change `package.json`, run `bun2nix bun-root` to regenerate `modules/bun-root.nix`.
- **`bun2nix` requires `bun` installed** — the dev shell provides it.
- **Frontend builds to root-level `static/`** — the Nix derivation copies from `${frontend}/static`, not from the working directory.
- **`start.sh` expects `APP_DIR`** — the NixOS module sets this to `${package}/app`; running directly use `/app`.
- **`bun.lock` files are per-workspace** — root `bun.lock` for backend, `ui/bun.lock` for frontend.
- **Backend runs on port 3001**, nginx proxies from the configured port (default 3000) to 3001.
- **`.gitignore` excludes**: `node_modules`, `static`, `content`, `config`, `result`.

## NixOS Module

- Enable with `services.youtubecast.enable = true`
- Settings map to `settings.json` — use `youtubeApiKeyFile` for SOPS integration
- Content directory defaults to `/var/lib/youtubecast`
