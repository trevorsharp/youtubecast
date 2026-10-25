# YouTubeCast — Repository Review

- **Date:** 2026-10-12
- **Scope:** full repo (`src/`, `ui/`, `modules/`, Docker + Nix packaging, docs)
- **Branch reviewed:** `main` @ `6df5639`
- **Method:** static reading of all source/config files, `git log`/`git show` to trace regressions, and `nix eval` to confirm the flake's advertised interface

This is a findings report. Each item lists severity, the exact location, the impact, and a
concrete recommendation. The fixes for these findings were implemented in the commits that
follow this report; the "ready-to-apply" patches at the end mirror what was applied to the
high-severity items.

---

## Summary

| #   | Severity | Area      | Issue                                                                   | Status      |
| --- | -------- | --------- | ----------------------------------------------------------------------- | ----------- |
| 1   | High     | NixOS     | `preStart` never creates `$CONFIG_BASE/config` → service can't boot     | ✅ verified |
| 2   | High     | NixOS     | `preStart` copies nginx conf to `/etc/nginx` as unprivileged user       | ✅ verified |
| 3   | High     | NixOS     | `cookies.txt` copied to wrong path, never found by the app              | ✅ verified |
| 4   | High     | Docker    | `nginx.conf` literal `${port}` breaks `CMD nginx && bun run start`      | ✅ verified |
| 5   | High     | Security  | YouTube API key written into world-readable Nix store                   | ✅ verified |
| 6   | Medium   | Nix flake | `nix run .` fails — no `apps.default`, no `meta.mainProgram`            | ✅ verified |
| 7   | Medium   | Backend   | `highestQuality` is a dead option (stripped by the validator)           | ✅ verified |
| 8   | Medium   | Backend   | Audio enclosures advertised as `audio/mp3` but served AAC/M4A           | ✅ verified |
| 9   | Medium   | UI        | RSS links drop the port and hardcode `http://`                          | ✅ verified |
| 10  | Medium   | Nginx     | `mime.types` removed → HLS `.m3u8`/`.ts` served with wrong content type | ✅ verified |
| 11  | Medium   | Docs      | README documents options that no longer exist (`youtubeApiKeyFile`)     | ✅ verified |
| 12  | Low      | NixOS     | `CONTENT_DIR` vs `YOUTUBECAST_CONTENT_DIR` env name mismatch            | ✅ verified |
| 13  | Low      | Perf      | Config re-read + re-validated on every call / cache miss                | ✅ verified |
| 14  | Low      | Backend   | `searchService` throws bare strings                                     | ✅ verified |
| 15  | Low      | Backend   | SPA catch-all answers unknown `/api/*` with `index.html`                | ✅ verified |
| 16  | Low      | UI        | `getSearchText` uses deprecated `decodeURI`                             | ✅ verified |
| 17  | Low      | Tooling   | `eslint`/`tsc` don't exclude `result/`; no test suite                   | ✅ verified |

---

## High severity

### 1. NixOS module never creates the config directory the app requires

`modules/default.nix:219-251` (the `preStart` script) does:

```nix
mkdir -p $CONTENT_DIR
mkdir -p $CONFIG_BASE           # ← creates <contentDir>/runtime, not .../config
...
cp $CONTENT_DIR/settings.json $CONFIG_BASE/config/
```

`CONFIG_BASE` is `${cfg.contentDir}/runtime` (line 207), and `src/env.ts:2` sets
`CONFIG_FOLDER_PATH = ${CONFIG_BASE}/config`. The `config` subdirectory is **never created**,
so the `cp` fails and `configService.verifyConfigFolderExists()` throws
`"Config folder does not exist. Please mount a volume at the path "/app/config"."` at startup.

This was introduced in `beea552` (`fix: add yt-dlp to service PATH and fix SOPS secret
integration`): that commit changed `mkdir -p $APP_DIR/config` into `mkdir -p $CONFIG_BASE`
(which was correct, `$APP_DIR` is read-only in the store) but dropped the `/config` suffix.

**Fix:** `mkdir -p "$CONFIG_BASE/config"`.

### 2. `preStart` writes to `/etc/nginx` as the unprivileged service user

`modules/default.nix:250` runs `cp $NGINX_CONF /etc/nginx/nginx.conf`, but the unit sets
`User = cfg.user` / `Group = cfg.group` (lines 254-255), so this command runs as
`youtubecast` and cannot write to `/etc/nginx` (root-owned). It will fail the `preStart`
script (NixOS runs these under `set -e`), taking the service down.

The copy is also **unused**: `start.sh:13` feeds `$NGINX_CONF` through `sed` into
`/tmp/youtubecast-nginx.conf` and starts nginx with `-c`.

**Fix:** delete the `cp $NGINX_CONF /etc/nginx/nginx.conf` line.

### 3. Cookies are copied to a path the app never reads

`modules/default.nix:242-244`:

```sh
if [ -f /etc/youtubecast/cookies.txt ]; then
  cp /etc/youtubecast/cookies.txt $CONTENT_DIR/
fi
```

but `src/env.ts:4` reads `COOKIES_TXT_FILE_PATH = ${CONFIG_BASE}/config/cookies.txt`, i.e.
`<contentDir>/runtime/config/cookies.txt`. Cookies therefore never reach `getCookies()`
(`src/services/videoService.ts:186-191`), silently breaking members-only / authenticated
content — one of the module's headline features.

**Fix:** copy to `$CONFIG_BASE/config/cookies.txt`.

### 4. Docker image no longer starts (literal `${port}` in nginx config)

`nginx.conf:22` is now `listen ${port};`. The upstream file had `listen 3000;`; commit
`561dd31` (the Nix integration) replaced it with a placeholder so `start.sh` can `${port}`-
substitute it. But the Docker image never runs `start.sh`:

```dockerfile
# Dockerfile:26,30
COPY nginx.conf /etc/nginx/nginx.conf
CMD nginx && bun run start
```

`nginx` reads the literal `${port}` and fails with `invalid port in "listen" directive`;
because of `&&`, `bun run start` never executes either. The published Docker image is broken.

**Fix (recommended):** run `start.sh` in the container and point it at the copied config
(see patch at the end). Alternatively, keep a concrete port in a Docker-specific config.

### 5. YouTube API key leaks into the world-readable Nix store

`modules/default.nix:129-138` builds `settingsJson = pkgs.writeText "settings.json" '' … "${cfg.settings.youtubeApiKey}" … ''`
and `modules/default.nix:189` installs it via `environment.etc`. Anything in `/nix/store`
(and therefore `/etc/youtubecast/settings.json`) is world-readable, so a key supplied directly
via `settings.youtubeApiKey` is exposed to every local user and to the store itself.

The value is also **dead code**: since `beea552`, `preStart` regenerates `settings.json` from
scratch (lines 223-239) and no longer reads `/etc/youtubecast/settings.json`.

**Fix:** remove the `settingsJson` binding and the `environment.etc."youtubecast/settings.json"`
entry; generate the file only at runtime in a root-private location. (If a build-time copy is
really wanted, write an empty placeholder — never the key.)

---

## Medium severity

### 6. `nix run .` fails

`README.md:12` and `AGENTS.md` advertise `nix run .`, and the integration plan
(`docs/plans/nix-integration.md:28`) promises `apps.<system>.default`. The flake defines
neither an `apps` output nor `meta.mainProgram`, and the only binary is
`bin/youtubecast-start` (confirmed: `result/bin/`).

```console
$ nix eval --raw '.#apps.x86_64-linux.default.program'
error: flake ... does not provide attribute 'apps.x86_64-linux.default.program' ...
```

Because the derivation is named `youtubecast`, `nix run` looks for `bin/youtubecast` and fails
to find a program.

**Fix:** add `meta.mainProgram = "youtubecast-start";` to `modules/youtubecast.nix`, and/or
define `apps.default` in `flake.nix`.

### 7. `highestQuality` is a dead option

`highestQuality` appears in `README.md:58,78`, `modules/default.nix:35,56,127,134,235`, and
`docs/plans/nix-integration.md:120` — but nowhere in `src/`. It is not part of
`src/validators/configValidator.ts`, so Zod silently strips it and no code ever reads it.
Commit `ea84714` ("Simplify video quality defaults…") removed the behaviour but left the
plumbing in the module and docs.

**Fix:** remove `highestQuality` from the module, README, and the plan, or re-implement it.
Leaving it documented-but-inert is the worst of both worlds.

### 8. Audio enclosures are mislabelled

`src/services/feedService.ts:51` emits `type: isAudioOnly ? 'audio/mp3' : 'video/mp4'`, but
the audio-only download/stream selects `bestaudio[acodec^=mp4a]`
(`src/services/videoService.ts:184`), i.e. MP4/AAC (typically `.m4a`), never MP3. Podcast
clients that trust the declared MIME type can reject or mishandle the enclosure.

**Fix:** advertise `audio/mp4` (or `audio/aac`) for audio-only enclosures.

### 9. UI-generated subscription links are wrong off the default port / behind TLS

`ui/src/components/RssLinks.tsx`:

```ts
const getRssLink = () => `${window.location.hostname}/${feedId}/feed${audioOnly ? '?audioOnly' : ''}`;
...
void navigator.clipboard.writeText(`http://${getRssLink()}`);
```

`window.location.hostname` **omits the port**, and the copy path hardcodes `http://` even on
HTTPS. The Apple/Pocket Casts deep links (`podcast://…`, `pktc://…`) inherit the same
missing-port host.

**Fix:** use `window.location.host` and `window.location.protocol` (or `window.location.origin`).

### 10. Nginx no longer serves MIME types

Commit `d58b064` removed the `include mime.types;` line from `nginx.conf`; the module-generated
config (`modules/default.nix:140-173`) never had it. With no `types` mapping, nginx serves the
HLS artefacts under `/content/` (`*.m3u8`, `*.ts`) with the default type, which strict clients
(e.g. AVPlayer) can refuse. This interacts with finding 8.

**Fix:** re-add `include ${pkgs.nginx}/conf/mime.types;` (or an inline `types` block) in both
configs.

### 11. README documents options that don't exist

The README option list (`README.md:50-67`) describes `youtubeApiKeyFile` (path) and defaults
`cookiesFile = ""`, `environmentFile = ""`. The actual module exposes `useSopsSecret` (bool,
`modules/default.nix:63`) and `cookiesFile`/`environmentFile` as `nullOr path` defaulting to
`null`. `nix-integration.md` is likewise stale (`youtubeApiKeyFile`). Users following the README
will hit an evaluation error on an unknown option.

**Fix:** regenerate the option docs from the module (or update by hand to match `useSopsSecret`).

---

## Low severity / improvements

### 12. `CONTENT_DIR` env-name mismatch

`start.sh:5` reads `YOUTUBECAST_CONTENT_DIR`, but the module exports `CONTENT_DIR`
(`modules/default.nix:209`). A custom `contentDir` is therefore ignored by `start.sh`'s
`mkdir` (it falls back to `/var/lib/youtubecast`). It happens to work only because the default
matches. Align the names.

### 13. Config is re-read and re-validated on every call

`configService.getConfig()` (`src/services/configService.ts:8`) does a `readdir`, an
`exists()`, a read, and a Zod parse every time. It is called from `cacheService.withCache`
on every cache miss, and from `feedService`, `queueService`, and `videoService`. Memoize the
parsed config (e.g. invalidate on mtime change) to remove redundant disk I/O and validation.

### 14. `searchService` throws bare strings

`src/services/searchService.ts:74` does `throw 'Sorry, something went wrong with your search'`.
Throwing non-`Error` values loses stack traces and bypasses typed error handling. Throw an
`Error` and add a Hono `onError` handler that returns a JSON error body.

### 15. SPA catch-all swallows unknown API paths

`src/router.ts:67` serves `index.html` for `/*`, so a typo'd or failing `/api/...` route returns
HTML with status 200. Scope the SPA fallback to non-`/api` paths (or return a 404 JSON body).

### 16. Deprecated `decodeURI` in the UI

`ui/src/utils/getSearchText.ts:8` uses `decodeURI` (prefer `decodeURIComponent`); encoded
`/` (`%2F`) is not decoded, which can mis-split URLs. Minor.

### 17. Tooling gaps

- `eslint.config.mjs` ignores only `node_modules` and `static`; `eslint .` can walk the
  `result/` symlink into the Nix store. Add `result/**` to `ignores`, and add an `exclude`
  for `result` in `tsconfig.json`.
- There is **no test suite** anywhere; `bun run lint` is the only gate. High-value first
  targets: `getSearchText`, feed URL construction in `feedService`, `configValidator` refine
  rules, and `AsyncQueue` ordering.
- `modules/default.nix` uses the legacy `preStart` plus no-op `ExecStartPre = ""` /
  `ExecStartPost = ""` (lines 256, 260). The empty assignments are suspicious and worth
  replacing with an explicit `ExecStartPre` script (a good opportunity to fix findings 1-3).

---

## Ready-to-apply patches (high-severity items)

### `modules/default.nix` — config dir, cookies, drop nginx copy

```diff
             mkdir -p $CONTENT_DIR
-            mkdir -p $CONFIG_BASE
+            mkdir -p $CONFIG_BASE/config
@@
             cp $CONTENT_DIR/settings.json $CONFIG_BASE/config/
             if [ -f /etc/youtubecast/cookies.txt ]; then
-              cp /etc/youtubecast/cookies.txt $CONTENT_DIR/
+              cp /etc/youtubecast/cookies.txt $CONFIG_BASE/config/cookies.txt
             fi
@@
             # Create content symlink so Bun can find it at $CONFIG_BASE/content
             ln -sfn $CONTENT_DIR $CONFIG_BASE/content
-
-            # Copy nginx config
-            cp $NGINX_CONF /etc/nginx/nginx.conf
           '';
```

### `modules/default.nix` — stop leaking the API key / remove dead `settings.json`

```diff
-        settingsJson = pkgs.writeText "settings.json" ''
-        {
-          "youtubeApiKey": "${cfg.settings.youtubeApiKey}",
-          ...
-        }
-        '';
-
         nginxConf = pkgs.writeText "nginx.conf" ''
@@
         # Generate configuration files
         environment.etc = cookiesTxt // {
-          "youtubecast/settings.json" = { source = settingsJson; };
           "youtubecast/nginx.conf" = { source = nginxConf; };
         };
```

### `Dockerfile` — run the port-substituting wrapper

```diff
 COPY nginx.conf /etc/nginx/nginx.conf
+COPY start.sh /app/start.sh
+RUN chmod +x /app/start.sh
+
+ENV APP_DIR=/app \
+    NGINX_CONF=/etc/nginx/nginx.conf \
+    YOUTUBECAST_CONTENT_DIR=/app/content \
+    YOUTUBECAST_PORT=3000

 # Run application
 EXPOSE 3000/tcp
-CMD nginx && bun run start
+CMD ["/app/start.sh"]
```

### `modules/youtubecast.nix` — let `nix run .` find the binary

```diff
   installPhase = ''
@@
     cp nginx.conf $out/app/nginx.example
   '';
+
+  meta.mainProgram = "youtubecast-start";
 }
```

---

## Suggested priority order

1. **Findings 1-5** (high): the NixOS service and Docker image are currently non-functional,
   and the API key is exposed. These are self-contained fixes.
2. **Findings 6-11** (medium): broken/advertised-but-missing interfaces, MIME correctness,
   and the dead `highestQuality` option.
3. **Findings 12-17** (low): polish, performance, and tooling/test coverage.
