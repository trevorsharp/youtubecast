{ pkgs }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    bun
    nodejs
  ];

  packages = with pkgs; [
    bun2nix
    typescript
    eslint
    prettier
  ];

  shellHook = ''
    export PATH="$PWD/ui/node_modules/.bin:$PATH"
  '';
}
