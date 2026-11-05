{
  pkgs,
  fetchBunDeps,
  hook,
}:

let
  # Everything the app and start.sh exec at runtime. Wired into the launcher via
  # makeWrapper so the derivation is self-contained: `nix run .` works on a
  # plain machine, and the NixOS module does not have to hand-assemble a PATH.
  runtimeDeps = with pkgs; [
    bun
    nginx
    ffmpeg
    yt-dlp
    # yt-dlp runs on python3 and shells out to ffmpeg
    python3
    # yt-dlp solves YouTube's JS challenges with node (--js-runtimes=node)
    nodejs
    # spawned by start.sh (mkdir, ln) and by the app (find)
    coreutils
    findutils
    # start.sh substitutes the nginx config placeholders
    gnugrep
    gnused
  ];

  # Only the files the build actually consumes. Editing the README, the
  # Dockerfile or the UI must not rebuild the backend, and untracked build
  # output (node_modules/, static/, ...) must never leak into the sandbox.
  backendSrc = pkgs.lib.fileset.toSource {
    root = ../.;
    fileset = pkgs.lib.fileset.unions [
      ../src
      ../package.json
      ../bun.lock
      ../tsconfig.json
      ../start.sh
      ../nginx.conf
    ];
  };

  uiSrc = pkgs.lib.fileset.toSource {
    root = ../ui;
    fileset = pkgs.lib.fileset.unions [
      ../ui/src
      ../ui/public
      ../ui/index.html
      ../ui/package.json
      ../ui/bun.lock
      ../ui/vite.config.ts
    ];
  };

  frontendDeps = fetchBunDeps {
    bunNix = ./bun-frontend.nix;
  };

  backendDepsCache = fetchBunDeps {
    bunNix = ./bun-root.nix;
  };

  frontend = pkgs.stdenvNoCC.mkDerivation {
    name = "youtubecast-frontend";

    src = uiSrc;

    nativeBuildInputs = [
      pkgs.bun
      hook
    ];

    bunDeps = frontendDeps;

    # Static files only: fixup would just rescan $out for ELF files/shebangs.
    dontFixup = true;

    # Vite must emit inside the build directory: `bun run build` writes to
    # ../static so Docker (which copies ui/ in without the output dir) keeps
    # working, so redirect it back with an explicit --outDir.
    buildPhase = ''
      runHook preBuild
      bun run build -- --outDir ./static
      runHook postBuild
    '';

    installPhase = ''
      mkdir -p $out
      mv static $out/static
    '';
  };
in
pkgs.stdenvNoCC.mkDerivation {
  name = "youtubecast";

  src = backendSrc;

  nativeBuildInputs = runtimeDeps ++ [
    pkgs.bun
    hook
    # to wrap the launcher into a self-contained binary
    pkgs.makeWrapper
  ];

  # The hook installs node_modules into the build directory from the
  # content-addressed bun cache. Production dependencies only: the runtime
  # package never needs eslint/prettier/typescript.
  bunDeps = backendDepsCache;
  bunInstallFlags = [
    "--frozen-lockfile"
    "--production"
  ];
  dontRunLifecycleScripts = true;
  dontUseBunBuild = true;
  dontFixup = true;

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin $out/app

    # googleapis ships 157 MB of TypeScript declarations (every Google API's
    # types) that Bun never loads at runtime. Drop them from the runtime
    # package instead of shipping dead weight.
    find node_modules -name '*.d.ts' -delete

    cp -r src $out/app/src
    cp -r node_modules $out/app/node_modules
    cp -r ${frontend}/static $out/app/static

    # One nginx config template shared with start.sh and the NixOS module
    cp nginx.conf $out/app/nginx.conf

    # Runtime deps (bun, nginx, ffmpeg, yt-dlp, ...) come from this derivation
    # instead of the ambient environment.
    cp start.sh $out/bin/youtubecast-start
    chmod +x $out/bin/youtubecast-start
    wrapProgram $out/bin/youtubecast-start \
      --prefix PATH : ${pkgs.lib.makeBinPath runtimeDeps} \
      --set-default APP_DIR $out/app \
      --set-default NGINX_CONF $out/app/nginx.conf

    runHook postInstall
  '';

  meta = {
    description = "Generate podcast feeds from YouTube channels and playlists";
    mainProgram = "youtubecast-start";
  };
}
