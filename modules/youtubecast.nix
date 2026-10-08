{
  pkgs,
  fetchBunDeps,
  hook,
}:

let
  commonDeps = with pkgs; [
    bun
    nodejs
    ffmpeg
    yt-dlp
    python3
  ];

  backendDeps = with pkgs; [
    openssl
    zlib
    zstd
    libiconv
  ];

  frontendDeps = fetchBunDeps {
    bunNix = ./bun-frontend.nix;
  };

  backendDepsCache = fetchBunDeps {
    bunNix = ./bun-root.nix;
  };

  frontend = pkgs.stdenvNoCC.mkDerivation {
    name = "youtubecast-frontend";

    src = ../ui;

    nativeBuildInputs = [
      pkgs.bun
      hook
    ];

    bunDeps = frontendDeps;

    buildPhase = ''
      runHook preBuild
      bun run build
      runHook postBuild
    '';

    installPhase = ''
      mkdir -p $out/static
      cp -r ../static/* $out/static/ 2>/dev/null || true
    '';
  };

in
pkgs.stdenvNoCC.mkDerivation {
  name = "youtubecast";

  src = ../.;

  nativeBuildInputs = commonDeps ++ [
    pkgs.bun
    hook
  ];
  buildInputs = backendDeps;

  dontUseBunBuild = true;

  bunDeps = backendDepsCache;

  LD_LIBRARY_PATH = "${pkgs.openssl.out}/lib:${pkgs.zlib.out}/lib:${pkgs.zstd.out}/lib";

  installPhase = ''
    mkdir -p $out/bin $out/app

    # Install backend dependencies using bun2nix cache
    bun install --frozen-lockfile

    # Copy backend source and node_modules
    cp -r src node_modules $out/app/

    # Copy built frontend static files from frontend derivation
    cp -r ${frontend}/static $out/app/static

    # Copy nginx config (port will be replaced by NixOS module)
    cp nginx.conf $out/app/nginx.conf

    # Copy startup script
    cp start.sh $out/bin/youtubecast-start
    chmod +x $out/bin/youtubecast-start

    # Copy nginx.conf to app dir for reference
    cp nginx.conf $out/app/nginx.example
  '';
}
