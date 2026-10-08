# YouTubeCast Nix Integration Plan

## Goal

Create a **Nix flake** and a **pure NixOS module** to build and run YouTubeCast natively on NixOS without Docker. The flake provides packages, apps, and devShells. The NixOS module declaratively manages the service.

---

## Project Summary

| Aspect                | Detail                                               |
| --------------------- | ---------------------------------------------------- |
| Language              | TypeScript (ESNext)                                  |
| Runtime               | Bun 1.3.14                                           |
| Backend Framework     | Hono (HTTP server)                                   |
| Frontend              | React 19 + Vite 8 + TanStack Router + Tailwind CSS 4 |
| System deps (current) | ffmpeg, nginx, python3, yt-dlp (nightly)             |
| Config file           | `config/settings.json`                               |
| Ports                 | 3000 (nginx, external), 3001 (Bun, internal)         |

---

## Deliverables

```text
flake.nix
├── packages.<system>.default    → the complete YouTubeCast application derivation
├── apps.<system>.default        → `nix run .` to start the service
└── devShells.<system>.default   → dev environment with bun, TypeScript, lint tools

modules/default.nix              → NixOS module (services.youtubecast)
```

---

## 1. Flake Structure (`flake.nix`)

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flakeUtils }:
    flakeUtils.forAllSystems (system: let
      pkgs = import nixpkgs { inherit system; };
    in {
      packages = {
        default = self.packages.${system}.youtubecast;
        youtubecast = ./modules/youtubecast.nix;  # or inline
      };

      apps.default = self.packages.${system}.youtubecast;
      # (XCHG: apps and packages can share the same derivation —
      #  we'll use `flakeUtils.lib.mkApp "drv"`)

      devShells = {
        default = pkgs.callPackage ./devshell.nix {};
      };
    });
}
```

---

## 2. Package Derivation (`packages.<system>.default`)

A single derivation that:

1. **Builds the frontend** — runs `bun install --frozen-lockfile` in `ui/`, then `bun run build` (Vite → `static/`).
2. **Builds the backend** — runs `bun install --production` in the root, copies `src/`.
3. **Wraps everything** with system dependencies:
   - `bun` (from nixpkgs)
   - `nginx` (from nixpkgs, with custom config)
   - `ffmpeg` (from nixpkgs)
   - `yt-dlp` (stable version from nixpkgs — **not** nightly)
   - `python3` (for yt-dlp runtime)

### Build phases

```shell
Phase 1: UI build
  └─ bun install (ui/bun.lock)
  └─ bun run build  → static/

Phase 2: Backend pack
  └─ bun install --production (bun.lock)
  └─ copy src/

Phase 3: Final package
  └─ bundle: static/, node_modules/src/, nginx.conf
  └─ runtime deps: bun, nginx, ffmpeg, yt-dlp, python3
  └─ service script: starts nginx + bun concurrently
```

### Output layout

```text
<package>/
├── bin/youtubecast-start   → script: starts nginx + bun
├── etc/nginx/youtubecast.conf  → nginx config (from nginx.conf, adapted)
├── app/                     → the application root (src/, node_modules/, static/)
```

---

## 3. NixOS Module (`modules/default.nix`)

### Public API

```nix
services.youtubecast = {
  enable = false;                          # enable the service
  port = 3000;                             # nginx external port
  settings = {                             # settings.json content
    youtubeApiKey = "";                    # required
    downloadVideos = false;
    maximumCompatibility = false;
    highestQuality = false;
    cacheTimeToLive = 1200;
    minimumVideoDuration = 180;
  };

  # Secret-file alternatives for SOPS-nix integration:
  youtubeApiKeyFile = "";                  # alternative: path to secret file

  contentDir = "/var/lib/youtubecast";     # downloadable videos directory
  cookiesFile = "";                        # optional: path to cookies.txt

  user = "youtubecast";                    # service user
  group = "youtubecast";                   # service group

  package = pkgs.youtubecast;              # override with custom derivation
};
```

### Module responsibilities

1. **Service user/group** — Create `youtubecast` user and group if they don't exist.
2. **Config generation** — Write `settings.json` to `$contentDir/settings.json`. If `youtubeApiKeyFile` is set, read from that file instead of `youtubeApiKey`. Same for `cookiesFile`.
3. **Nginx config** — Generate nginx config listening on `port`, proxying to Bun on a high port (>1024). Serve `/content/` from `contentDir`.
4. **Systemd service** — Start nginx + Bun as a oneshot/preStart so both run together. Or use a wrapper script that runs both processes.
5. **State directory** — Create `contentDir` with correct ownership.

### Directory layout

```text
/var/lib/youtubecast/
├── settings.json      (generated by module)
├── cookies.txt        (symlinked from cookiesFile if provided)
└── <downloaded videos>
```

### Nginx configuration

The module generates an nginx config based on the user's `port`:

```nginx
server {
  listen <port>;
  location /content/ {
    root <contentDir>;
  }
  location / {
    proxy_pass http://127.0.0.1:<bunPort>;
  }
}
```

Bun listens on a dynamically assigned high port (e.g., `3001 + (port - 3000)`) to avoid conflicts with other services.

---

## 4. Secrets Handling (`*File` pattern)

For every secret in `settings.json`, provide a corresponding `*File` option:

| Setting         | Direct option                    | File option (SOPS-nix friendly)                      |
| --------------- | -------------------------------- | ---------------------------------------------------- |
| `youtubeApiKey` | `settings.youtubeApiKey = "..."` | `youtubeApiKeyFile = "/run/secrets/youtube-api-key"` |

**Behavior:** If `*File` is set, it takes precedence. The module reads the file content and writes the value into `settings.json` at runtime. This allows SOPS-nix to place decrypted secrets in `/run/secrets/`.

---

## 5. Development Shell (`devShells.<system>.default`)

A dev shell providing:

| Tool                | Source                 |
| ------------------- | ---------------------- |
| `bun`               | nixpkgs                |
| `typescript`        | from `devDependencies` |
| `eslint`            | from `devDependencies` |
| `prettier`          | from `devDependencies` |
| `nodejs` (for Vite) | nixpkgs                |

```nix
{ pkgs, ... }:
pkgs.mkShell {
  packages = with pkgs; [
    bun
    typescript
    nodePackages.eslint
    nodePackages.prettier
  ];
}
```

---

## 6. Migration Notes (Docker → NixOS)

| Docker aspect                          | NixOS equivalent                           |
| -------------------------------------- | ------------------------------------------ |
| `oven/bun:1.3.14-alpine`               | `pkgs.bun` (glibc-based, no Alpine)        |
| `apk add ffmpeg python3 py3-pip nginx` | Include in `packages` of derivation        |
| yt-dlp nightly from GitHub             | `pkgs.yt-dlp` (stable version)             |
| Multi-stage Docker build               | Single Nix derivation with build phases    |
| `VOLUME` mounts                        | `contentDir` + config generation in module |
| `EXPOSE 3000`                          | Nginx `listen <port>` in module config     |
| `CMD nginx && bun run start`           | Wrapper script: `start.sh` that runs both  |

### Key differences to handle

- **Alpine → glibc:** The Docker image uses Alpine Linux. NixOS uses glibc. All binaries will be glibc-based. No compatibility issues expected (ffmpeg, nginx, python3 all work fine on glibc).
- **yt-dlp nightly → stable:** The stable `yt-dlp` from nixpkgs may lack some extractor improvements from the nightly build. This is an acceptable trade-off for Nix integration. If specific nightly features are critical, we can add a custom derivation later.
- **No `pip` needed:** yt-dlp is a standalone binary in nixpkgs. No Python pip installation required at runtime.

---

## 7. Implementation Order

| Step | Task                                                                                                 | Files to create/modify          |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1    | **Write `flake.nix`** — Define inputs, outputs, `flakeUtils.forAllSystems`                           | `flake.nix` (new)               |
| 2    | **Write package derivation** — Frontend build + backend pack + runtime bundle                        | `modules/youtubecast.nix` (new) |
| 3    | **Write NixOS module** — `services.youtubecast` options, service activation, nginx config generation | `modules/default.nix` (new)     |
| 4    | **Write devShell** — Development environment with bun, typescript, eslint, prettier                  | `devshell.nix` (new)            |
| 5    | **Update `nginx.conf`** — Make port configurable via a variable for the module to use                | `nginx.conf` (modify)           |
| 6    | **Test locally** — `nix build`, `nix run`, enable module on a test system                            | (manual testing)                |

---

## 8. Files to Create

| File                      | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `flake.nix`               | Flake definition: packages, apps, devShells   |
| `modules/youtubecast.nix` | Package derivation (frontend + backend build) |
| `modules/default.nix`     | NixOS module (service, options, activation)   |
| `devshell.nix`            | Development shell definition                  |

## 9. Files to Modify

| File         | Change                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `nginx.conf` | Replace hardcoded port `3000` with a variable (e.g., `$PORT`) so the NixOS module can inject the user's chosen port |

---

## Open Questions / Decisions Needed

1. **Bun version pinning:** Should we pin to `bun` 1.3.14 (matching the Docker image) or use whatever is latest in nixpkgs? → **Decision: Pin to 1.3.14 for parity with Docker.**

2. **Service management:** Should nginx and Bun run as a single systemd service (wrapper script) or as two separate services? → **Recommendation: Single wrapper script** managed by one systemd service, so they share lifecycle.

3. **Default port:** Default to 3000 (same as Docker) or a higher non-privileged port? → **Decision: Default 3000** (matches Docker).

4. **yt-dlp stable version:** The stable nixpkgs version may differ from the nightly build used in Docker. Should we document this as a known limitation? → **Agreed: Document it, but ship stable.**

5. **Content directory default:** `/var/lib/youtubecast`? Or `/var/lib/youtubecast/content`? → **Decision: `/var/lib/youtubecast`** (simpler, no nested `content/`).
