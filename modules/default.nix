{
  config,
  pkgs,
  lib,
  specialArgs ? { },
  ...
}:
{
  options.services.youtubecast = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to enable the YouTubeCast service.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port for nginx to listen on (external).";
    };

    settings = lib.mkOption {
      type = lib.types.submodule {
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
      default = {
        youtubeApiKey = "";
        downloadVideos = false;
        maximumCompatibility = false;
        cacheTimeToLive = 1200;
        minimumVideoDuration = 180;
        maxItems = null;
      };
      description = "YouTubeCast settings (equivalent to settings.json).";
    };

    youtubeApiKeyFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to a file containing the YouTube API key.
        Takes precedence over `settings.youtubeApiKey`.
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
      description = "Network interface for nginx to bind to.";
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Path to an environment file for service variables.";
    };
  };

  config = lib.mkIf config.services.youtubecast.enable (
    let
      bun2nix = specialArgs.bun2nix or null;
    in
    if bun2nix == null then
      throw "When enabling services.youtubecast, you must pass bun2nix via specialArgs:\n  inherit (youtubecast.inputs) bun2nix;"
    else
      let
        bun2nixPkg = bun2nix.packages.${pkgs.system}.bun2nix;
        fetchBunDeps = bun2nixPkg.passthru.fetchBunDeps;
        hook = bun2nixPkg.passthru.hook;
        pkg = import ../modules/youtubecast.nix {
          inherit pkgs fetchBunDeps hook;
        };
        cfg = config.services.youtubecast;

        dl = if cfg.settings.downloadVideos then "true" else "false";
        mc = if cfg.settings.maximumCompatibility then "true" else "false";

        nginxConf = pkgs.writeText "nginx.conf" ''
          worker_processes  auto;
          error_log /tmp/nginx-error.log warn;

          events {
            worker_connections  1024;
          }

          http {
            include ${pkgs.nginx}/conf/mime.types;

            # Proxy
            proxy_http_version  1.1;
            proxy_cache_bypass  $http_upgrade;
            proxy_set_header Upgrade           $http_upgrade;
            proxy_set_header Connection        "upgrade";
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host  $host;
            proxy_set_header X-Forwarded-Port  $server_port;

            server {
              listen ${toString cfg.port};

              location /content/ {
                root /app;
              }

              location / {
                proxy_pass http://127.0.0.1:3001$request_uri;
              }
            }
          }
        '';

        cookiesTxt =
          if cfg.cookiesFile != null then
            {
              "youtubecast/cookies.txt" = {
                source = cfg.cookiesFile;
              };
            }
          else
            { };
      in
      {
        # Create service user and group
        users.groups.${cfg.group} = { };
        users.users.${cfg.user} = {
          extraGroups = [ cfg.group ];
          isSystemUser = true;
          group = cfg.group;
        };

        # Generate configuration files
        environment.etc = cookiesTxt // {
          "youtubecast/nginx.conf" = {
            source = nginxConf;
          };
        };

        # Create content directory
        systemd.tmpfiles.rules = [
          "d ${cfg.contentDir} 0750 ${cfg.user} ${cfg.group} -"
        ];

        # Systemd service
        systemd.services.youtubecast = {
          description = "YouTubeCast - Generate podcast feeds from YouTube";
          wantedBy = [ "multi-user.target" ];
          wants = [ "nginx.service" ];
          after = [ "nginx.service" ];

          environment = {
            APP_DIR = "${pkg}/app";
            CONFIG_BASE = "${cfg.contentDir}/runtime";
            NGINX_CONF = "/etc/youtubecast/nginx.conf";
            CONTENT_DIR = cfg.contentDir;
            YOUTUBECAST_PORT = toString cfg.port;
            PATH = lib.mkForce "${pkgs.bun}/bin:${pkgs.nginx}/bin:${pkgs.yt-dlp}/bin:${pkgs.coreutils}/bin:${pkgs.findutils}/bin:${pkgs.gnugrep}/bin:${pkgs.gnused}/bin";
            LOCALE_ARCHIVE = "${pkgs.glibcLocales}/lib/locale/locale-archive";
          }
          // lib.optionalAttrs (cfg.environmentFile != null) {
            ENVIRONMENT_FILE = cfg.environmentFile;
          };

          preStart = ''
                mkdir -p $CONTENT_DIR
                mkdir -p $CONFIG_BASE/config

                # Generate settings.json with YouTube API key from file or settings at runtime
                if [ -n "${if cfg.youtubeApiKeyFile != null then "1" else ""}" ]; then
                  YOUTUBE_KEY=$(cat ${cfg.youtubeApiKeyFile})
                else
                  YOUTUBE_KEY="${cfg.settings.youtubeApiKey}"
                fi

                cat > $CONTENT_DIR/settings.json <<EOF
            {
              "youtubeApiKey": "$YOUTUBE_KEY",
              "downloadVideos": ${dl},
              "maximumCompatibility": ${mc},
              "cacheTimeToLive": ${toString cfg.settings.cacheTimeToLive},
              "minimumVideoDuration": ${toString cfg.settings.minimumVideoDuration}
              ${
                if cfg.settings.maxItems != null then
                  ",\n              \"maxItems\": ${toString cfg.settings.maxItems}"
                else
                  ""
              }
            }
            EOF

                cp $CONTENT_DIR/settings.json $CONFIG_BASE/config/
                if [ -f /etc/youtubecast/cookies.txt ]; then
                  cp /etc/youtubecast/cookies.txt $CONFIG_BASE/config/cookies.txt
                fi

                # Create content symlink so Bun can find it at $CONFIG_BASE/content
                ln -sfn $CONTENT_DIR $CONFIG_BASE/content
          '';

          serviceConfig = {
            User = cfg.user;
            Group = cfg.group;
            ExecStartPre = "";
            ExecStart = "${pkg}/bin/youtubecast-start";
            Restart = "on-failure";
            RuntimeDirectory = "youtubecast";
            ExecStartPost = "";
          };
        };

        # Nginx is started by the wrapper script, so disable the default nginx service
        # unless explicitly enabled by the user
        networking.firewall.allowedTCPPorts = lib.mkIf (!config.services.nginx.enable) [
          (lib.toInt (toString cfg.port))
        ];
      }
  );
}
