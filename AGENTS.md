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
- `bun run test` — run unit tests (bun test)
- `bun run prettier` — format everything

## Architecture

- **Backend**: Bun + TypeScript (Hono) in `src/` — entrypoint `src/index.ts`, routes in `src/router.ts`
- **Frontend**: React + Vite + Tailwind (v4) in `ui/` — builds to root-level `static/`
- **Nix**: `flake.nix` orchestrates builds; `modules/youtubecast.nix` is the backend derivation; `modules/default.nix` is the NixOS service module
- **Two bun dependency sets**: `modules/bun-root.nix` (backend), `modules/bun-frontend.nix` (frontend)
- **Output**: `result/app/` (source + node_modules + static), `result/bin/youtubecast-start` (script the module starts)
- **`nginx.conf` is shared**: one template for the package, the NixOS module and Docker. `start.sh` fills in `${port}`, `${bindAddress}`, `${configBase}` and `${runtimeDir}`; the NixOS module fills them in at evaluation time instead.

## Gotchas

- **Do NOT use `bun pm migrate`** — the Nix build uses `bun2nix.fetchBunDeps` which bypasses bun's lockfile migration.
- To regenerate dependency manifests after changing `package.json` (or `ui/package.json`):
  ```bash
  bun2nix -l bun.lock -o modules/bun-root.nix
  bun2nix -l ui/bun.lock -o modules/bun-frontend.nix
  ```
  (`bun2nix` needs `bun` on PATH — the dev shell provides it. The regenerated file may carry three extra unused function arguments that the checked-in files drop.)
- **Sources are filtered** — the package derivation only sees `src/`, `package.json`, `bun.lock`, `tsconfig.json`, `start.sh` and `nginx.conf`; the frontend only sees what it needs from `ui/`. Editing docs or the README must not rebuild the backend.
- **The frontend build writes into the build directory** — the derivation passes `--outDir ./static` to Vite because the repo's build script writes to `../static` for Docker's benefit.
- **`start.sh` expects `APP_DIR`** — the NixOS module sets this to `${package}/app`; running directly (Docker) uses `/app`.
- **`bun.lock` files are per-workspace** — root `bun.lock` for backend, `ui/bun.lock` for frontend.
- **Backend runs on port 3001**, nginx proxies from the configured port (default 3000) to 3001.
- **The backend installs production dependencies only** — devDeps (eslint, prettier, typescript) are for `bun run lint`, not the runtime package. `googleapis`' TypeScript declarations are stripped from the package (they are ~160 MB and are never loaded).
- **`.gitignore` excludes**: `node_modules`, `static`, `content`, `config`, `result`.

## NixOS Module

- Enable with `services.youtubecast.enable = true`
- Import `youtubecast.nixosModules.default` directly — no `specialArgs` needed (the module picks its package from `pkgs.system`)
- Settings map to `settings.json` — use `services.youtubecast.youtubeApiKeyFile` for secrets from any encryption system
- `settings.json` is written on every service start (never at build time), so a key from `youtubeApiKeyFile` never reaches the nix store
- Content directory defaults to `/var/lib/youtubecast`; the app also gets a `runtime/` subdirectory holding its config and the `content` symlink nginx serves from
