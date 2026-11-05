{
  config,
  pkgs,
  lib,
  # Injected by flake.nix through `_module.args` for the system being
  # evaluated. Consumers add `youtubecast.nixosModules.default` to `modules`
  # directly — no specialArgs needed.
  youtubecastPackages ? { },
  ...
}:

let
  cfg = config.services.youtubecast;

  pkg =
    if cfg.package != null then
      cfg.package
    else
      youtubecastPackages.youtubecast
        or (throw "youtubecast: this flake builds no package for ${pkgs.system}; set services.youtubecast.package to your own");

  # The app reads settings.json (and cookies.txt) from $CONFIG_BASE/config, so
  # everything it needs is generated here rather than shipped in the store.
  configBase = "${cfg.contentDir}/runtime";
  configPath = "${configBase}/config";
  contentLink = "${configBase}/content";

  # Single source of truth: the repo's nginx.conf. Filling the placeholders in
  # here means /etc/youtubecast/nginx.conf is a complete, valid config and
  # start.sh's substitution step is a no-op.
  nginxConf = pkgs.writeText "youtubecast-nginx.conf" (
    lib.replaceStrings
      [
        "\${port}"
        "\${bindAddress}"
        "\${configBase}"
        "\${runtimeDir}"
      ]
      [
        (toString cfg.port)
        cfg.bindAddress
        configBase
        "/run/youtubecast"
      ]
      (builtins.readFile ../nginx.conf)
  );

  # settings.json is rendered at eval time with a placeholder in place of the
  # API key; the key is filled in on every service start so it never has to
  # enter the (world-readable) nix store.
  settingsTemplate = pkgs.writeText "youtubecast-settings.json" (
    builtins.toJSON (
      lib.filterAttrs (_: value: value != null) (cfg.settings // { youtubeApiKey = "@YOUTUBE_API_KEY@"; })
    )
  );

  # Reading the key has to be decided in Nix, not inside the shell script:
  # interpolating a null option would fail the whole evaluation.
  apiKeyCommand =
    if cfg.youtubeApiKeyFile != null then
      "YOUTUBE_API_KEY=$(cat ${lib.strings.escapeShellArg cfg.youtubeApiKeyFile})"
    else
      "YOUTUBE_API_KEY=${lib.escapeShellArg cfg.settings.youtubeApiKey}";

  cookiesTxt = lib.optionalAttrs (cfg.cookiesFile != null) {
    "youtubecast/cookies.txt" = {
      source = cfg.cookiesFile;
    };
  };
in
{
  options.services.youtubecast = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to enable the YouTubeCast service.";
    };

    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = ''
        The YouTubeCast package to run. Defaults to the package this flake builds
        for `pkgs.system`; set it to run your own override.
      '';
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port for nginx to listen on (external).";
    };

    settings = lib.mkOption {
      type = lib.types.submodule {
        # settings.json accepts extra keys, but the app only reads these
        freeformType = lib.types.attrs;

        options = {
          youtubeApiKey = lib.mkOption {
            type = lib.types.str;
            default = "";
            description = "YouTube Data API v3 key.";
          };

          downloadVideos = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Enable video downloads.";
          };

          maximumCompatibility = lib.mkOption {
            type = lib.types.bool;
            default = false;
            description = "Download videos as MP4 instead of HLS.";
          };

          cacheTimeToLive = lib.mkOption {
            type = lib.types.int;
            default = 1200;
            description = "Cache TTL in seconds (default: 1200).";
          };

          minimumVideoDuration = lib.mkOption {
            type = lib.types.int;
            default = 180;
            description = "Minimum video duration in seconds (default: 180).";
          };

          maxItems = lib.mkOption {
            type = lib.types.nullOr lib.types.int;
            default = null;
            description = "Default maximum number of items in the RSS feed (1-5000).";
          };
        };
      };
      default = { };
    };

    youtubeApiKeyFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to a file containing the YouTube API key. Takes precedence over
        `settings.youtubeApiKey`.

        The file is read when the service starts, not at build time, so it can
        point at a runtime secret (e.g. a sops-nix path).
      '';
    };

    cookiesFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Path to a cookies.txt file for authenticated YouTube content.";
    };

    contentDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/youtubecast";
      description = "Directory for storing downloaded videos.";
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "youtubecast";
      description = "Service user name.";
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "youtubecast";
      description = "Service group name.";
    };

    bindAddress = lib.mkOption {
      type = lib.types.str;
      default = "0.0.0.0";
      description = ''
        Network interface for nginx to bind to. Use an IPv4 address; for IPv6
        wrap it in brackets (nginx syntax), e.g. `"[::1]"`.
      '';
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Path to an environment file for service variables.";
    };
  };

  config = lib.mkIf cfg.enable {
    users.groups.${cfg.group} = { };

    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
    };

    # Readable only by root/the service group, so the api key file and cookies
    # are not world-readable.
    environment.etc = cookiesTxt // {
      "youtubecast/nginx.conf" = {
        source = nginxConf;
      };
    };

    # Content directory plus the runtime dir tree the app writes into.
    systemd.tmpfiles.rules = [
      "d ${cfg.contentDir} 0750 ${cfg.user} ${cfg.group} -"
      "d ${configBase} 0750 ${cfg.user} ${cfg.group} -"
      "d ${configPath} 0750 ${cfg.user} ${cfg.group} -"
    ];

    assertions = [
      {
        assertion = cfg.youtubeApiKeyFile != null || cfg.settings.youtubeApiKey != "";
        message = ''
          services.youtubecast needs a YouTube API key: set settings.youtubeApiKey
          or point youtubeApiKeyFile at a file containing one.
        '';
      }
      {
        assertion = !cfg.settings.maximumCompatibility || cfg.settings.downloadVideos;
        message = ''
          services.youtubecast.settings.maximumCompatibility requires
          settings.downloadVideos = true.
        '';
      }
      {
        assertion =
          cfg.settings.maxItems == null || (cfg.settings.maxItems >= 1 && cfg.settings.maxItems <= 5000);
        message = "services.youtubecast.settings.maxItems must be between 1 and 5000.";
      }
    ];

    systemd.services.youtubecast = {
      description = "YouTubeCast - Generate podcast feeds from YouTube";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [ "network-online.target" ];

      path = [
        pkgs.bun
        pkgs.nginx
        pkgs.ffmpeg
        pkgs.yt-dlp
        pkgs.python3
        # yt-dlp solves YouTube's JS challenges with node (--js-runtimes=node)
        pkgs.nodejs
        pkgs.coreutils
        pkgs.findutils
        pkgs.gnugrep
        pkgs.gnused
      ];

      environment = {
        APP_DIR = "${pkg}/app";
        CONFIG_BASE = configBase;
        NGINX_CONF = "/etc/youtubecast/nginx.conf";
        # nginx's pid file and logs live here (RuntimeDirectory, owned by the
        # service user) instead of the read-only /var/log defaults nginx is
        # compiled with.
        NGINX_RUNTIME_DIR = "/run/youtubecast";
        CONTENT_DIR = cfg.contentDir;
        YOUTUBECAST_PORT = toString cfg.port;
        YOUTUBECAST_BIND_ADDRESS = cfg.bindAddress;
        LOCALE_ARCHIVE = "${pkgs.glibcLocales}/lib/locale/locale-archive";
      }
      // lib.optionalAttrs (cfg.environmentFile != null) {
        ENVIRONMENT_FILE = cfg.environmentFile;
      };

      # Regenerated on every start: the key may live in a runtime secret, and a
      # first boot needs the config folder in place before getConfig() runs.
      preStart = ''
        mkdir -p ${configPath}
        mkdir -p $CONTENT_DIR

        ${apiKeyCommand}

        # jq does the substitution and the JSON escaping, so no key value has to
        # survive a shell round-trip. The template holds every other setting.
        ${pkgs.jq}/bin/jq --arg key "$YOUTUBE_API_KEY" \
          '.youtubeApiKey = $key' ${settingsTemplate} >${configPath}/settings.json

        if [ -f /etc/youtubecast/cookies.txt ]; then
          cp /etc/youtubecast/cookies.txt ${configPath}/cookies.txt
        fi

        ln -sfn $CONTENT_DIR ${contentLink}
      '';

      serviceConfig = {
        User = cfg.user;
        Group = cfg.group;
        ExecStart = "${pkg}/bin/youtubecast-start";
        Restart = "on-failure";
        RuntimeDirectory = "youtubecast";
        RuntimeDirectoryMode = "0750";
        # nginx proxies large video files; give the service headroom.
        LimitNOFILE = 65535;
      };
    };

    # Only manage our own port unless the host already runs nginx, in which
    # case the host's firewall config decides.
    networking.firewall.allowedTCPPorts = lib.mkIf (!config.services.nginx.enable) [
      (lib.toInt (toString cfg.port))
    ];
  };
}
