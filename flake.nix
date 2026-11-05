{
  description = "Generate podcast feeds from YouTube channels and playlists";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake_utils.url = "github:numtide/flake-utils";
    bun2nix.url = "github:nix-community/bun2nix?ref=2.1.2";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-substituters = [
      "https://nix-community.cachix.org"
    ];
    extra-trusted-public-keys = [
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      flake_utils,
      bun2nix,
    }:
    let
      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          overlays = [ bun2nix.overlays.default ];
        };
    in
    flake_utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = pkgsFor system;
        bun2nixPkg = bun2nix.packages.${system}.bun2nix;
        fetchBunDeps = bun2nixPkg.passthru.fetchBunDeps;
        hook = bun2nixPkg.passthru.hook;
      in
      {
        packages = {
          default = self.packages.${system}.youtubecast;
          youtubecast = import ./modules/youtubecast.nix {
            inherit pkgs fetchBunDeps hook;
          };
        };

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.youtubecast}/bin/youtubecast-start";
        };

        devShells.default = import ./devshell.nix {
          inherit pkgs;
        };

        checks.package = self.packages.${system}.youtubecast;
      }
    )
    // {
      # Consumers add `youtubecast.nixosModules.default` to `modules` directly:
      # this wrapper hands the module the per-system package set it needs, so
      # no specialArgs (bun2nix, self, ...) are required.
      nixosModules.default =
        { pkgs, ... }:
        {
          _module.args.youtubecastPackages = self.packages.${pkgs.system};

          imports = [ ./modules/default.nix ];
        };
    };
}
