{ pkgs }:

pkgs.mkShell {
  packages = with pkgs; [
    bun
    nodejs
    bun2nix
    typescript
    eslint
    prettier
  ];

  shellHook = ''
    # The repo pins its own typescript/eslint/prettier and `bun run lint`
    # needs their type declarations, so install the workspace dependencies
    # (gitignored) on first entry. Subsequent entries skip this.
    if [ -f flake.nix ]; then
      if [ ! -d node_modules ]; then
        echo "youtubecast devshell: installing backend dependencies"
        bun install --frozen-lockfile
      fi
      if [ ! -d ui/node_modules ]; then
        echo "youtubecast devshell: installing ui dependencies"
        (cd ui && bun install --frozen-lockfile)
      fi
    fi

    export PATH="$PWD/ui/node_modules/.bin:$PWD/node_modules/.bin:$PATH"
  '';
}
