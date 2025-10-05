# YouTubeCast

Create podcast feeds from YouTube channels and playlists

## Features

- Generate RSS feeds that can be added to podcast apps with support for video podcasts (e.g. Pocket Casts)
- Simple web server for serving RSS feed data, video links, and UI

## Changes as of October 2025

YouTubeCast now supports 1080p video streaming without requiring video downloads. Additionally, a new maximum compatibility mode has been added for better podcast app compatibility.

Additional Changes:

- 1080p video quality is now available through streaming without requiring downloads to your machine
- Added `maximumCompatibility` setting for better compatibility with podcast apps that don't support HLS streaming
- Maximum compatibility mode requires `downloadVideos` to be enabled and will download videos as MP4 files instead of HLS format

## Self-Hosted Setup Using Docker

Prerequisites:

- Ensure Docker is set up and running on your machine (https://docs.docker.com/get-docker)
- Set up a hostname that can be used to access your machine from the internet (can use a static IP address as well)
- Get a YouTube API v3 key set up (https://developers.google.com/youtube/v3/getting-started)

To run this application using Docker:

1. Create the `docker-compose.yml` file as described below
2. Run `docker-compose up -d` in the folder where your `docker-compose.yml` lives
3. Check the logs using `docker-compose logs -f` to see if there are any errors in your configuration
4. Open your `settings.json` file inside your `config` folder and set your `youtubeApiKey`
5. Access the UI on port 80, input a channel's name, and add the podcast feed to your podcast app of choice

### docker-compose.yml

```yml
services:
  youtubecast:
    image: trevorsharp/youtubecast:latest
    container_name: youtubecast
    restart: unless-stopped
    ports:
      - 80:3000
    volumes:
      - ./config:/app/config
```

Create a file named `docker-compose.yml` with the contents above.

### settings.json

```json
{
  "youtubeApiKey": "",
  "downloadVideos": false
}
```

### cookies.txt (Optional)

If you want to download YouTube content that requires user authentication to download, you will need to add cookies to your configuration. One reason for needing this is to download members-only videos. Note that the source of these videos (channel, user, or playlist) still must be either public or unlisted. For members-only videos, go to the channel's home page and scroll down to find an auto-generated playlist titled "Members-only videos" which will contain all the videos posted for members of the channel.

To generate this file:

1. Download a browser extension (such as [this one](https://chrome.google.com/webstore/detail/open-cookiestxt/gdocmgbfkjnnpapoeobnolbbkoibbcif) for Chrome)
2. Log in to YouTube
3. With a YouTube tab open, open the cookies.txt extension and download the cookies.txt file
4. Copy the file into your config folder and rename it to `cookies.txt`

### Download Videos (Optional)

YouTubeCast now supports 1080p video streaming without requiring downloads. However, you can optionally enable video downloads for offline storage or to use maximum compatibility mode. Note that downloading videos will significantly increase your disk usage.

To enable video downloads:

1. Set `downloadVideos` to `true` in your `settings.json`
2. Add `- ./content:/app/content` to the `volumes` section of your `docker-compose.yml` file

NOTE - Everything inside your `content` folder will be accessible via the web server. DO NOT place any files that you do not want to be accessed inside this folder. It should only contain the video files (and HLS playlist files) that are downloaded by YouTubeCast.

### Configure Minimum Video Duration (Optional)

By default, YouTubeCast excludes videos shorter than 3 minutes (180 seconds) from feeds, assuming they are YouTube Shorts. You can customize this threshold by setting the `minimumVideoDuration` value in your `settings.json`:

```json
{
  "minimumVideoDuration": 60
}
```

In this example, videos shorter than 1 minute (60 seconds) would be excluded. Set this value based on your preferences for what constitutes a "short" video that should be filtered out of your podcast feeds.

### Maximum Compatibility Mode (Optional)

By default, YouTubeCast streams videos in HLS format which provides efficient streaming but may not be compatible with all podcast apps. If you experience playback issues with certain podcast apps, you can enable maximum compatibility mode to download videos as standard MP4 files instead.

**Prerequisites:** Maximum compatibility mode requires video downloads to be enabled.

To enable maximum compatibility mode:

1. First, enable video downloads by setting `downloadVideos` to `true` in your `settings.json`
2. Add the maximum compatibility setting:

```json
{
  ...
  "downloadVideos": true,
  "maximumCompatibility": true
}
```

**Note:** Enabling this mode will:
- Require `downloadVideos` to be enabled
- Download videos as `.mp4` files instead of `.m3u8` files
- May result in larger file sizes and longer download times
- Provides better compatibility with podcast apps that don't support HLS streaming

---

## Changes as of April 2025

YouTubeCast has been re-architected from the ground up given the recent prioritization for self-hosting (see the [December 2024 changes](#changes-as-of-december-2024) for context). Support for downloading videos is now included natively inside YouTubeCast (alongside support for video streaming) without needing to use the now-deprecated YouTubeCast Video Server.

Additional Changes:

- To simplify the setup, video quality is not configurable on a per-feed basis.
- Settings are now stored in a `settings.json` file under a `config` folder instead of using environment variables. If you would like to use YouTube cookies, you can place a `cookies.txt` file inside the `config` folder instead of using environment variables.
- Support for `ENABLE_PLAYLIST_SORTING` has been removed for now due to the complexity of supporting it.
- Any video shorter than 3 minutes long is assumed to be a YouTube Short and is excluded from feeds by default. This behavior can be configured using the `minimumVideoDuration` setting.
- There is currently no support for cleaning up old video downloads. This may be included in a future update.

## Changes as of December 2024

As of December 2024, YouTubeCast is no longer publicly hosted. YouTube has made changes to combat bot traffic that make it impractical to host a publicly available version of YouTubeCast. Self-hosting should be used instead moving forward.

Additional Changes:

- YouTubeCast Video Server is being deprecated in favor of unifying all of YouTubeCast's functionality in a single project.
- YouTube Shorts are now always exlcuded and the `excludeShorts` query parameter has been deprecated.
- Support for Redis cache has been removed as distributed hosting is no longer practical (in-memory cache will be used instead).
