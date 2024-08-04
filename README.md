# YouTubeCast

Create podcast feeds from YouTube channels and playlists. Go to [youtubecast.com](https://youtubecast.com) to check it out!

## Features

- Generate RSS feeds that can be added to podcast apps with support for video podcasts (e.g. Pocket Casts)
- Simple web server for serving RSS feed data, video links, and UI

## Self-Hosted Setup Using Docker

Prerequisites:

- Ensure Docker is set up and running on your machine (https://docs.docker.com/get-docker)
- Set up a hostname that can be used to access your machine from the internet (can use a static IP address as well)
- Get a YouTube API v3 key set up (https://developers.google.com/youtube/v3/getting-started)

To run this application using Docker:

1. Create the `docker-compose.yml` file as described below
2. Run `docker-compose up -d` in the folder where your `docker-compose.yml` lives
3. Check the logs using `docker-compose logs -f` to see if there are any errors in your configuration
4. Access the UI on port 80, input a channel's name, and add the podcast feed to your podcast app of choice

### docker-compose.yml

```
services:
  youtubecast:
    image: trevorsharp/youtubecast:latest
    container_name: youtubecast
    restart: unless-stopped
    ports:
      - 80:3000
    environment:
      - YOUTUBE_API_KEY="XXXXX"
      - COOKIES="XXXXX"
      - ENABLE_PLAYLIST_SORTING=false
```

Create a file named `docker-compose.yml` with the contents above. Add in your YouTube API key.

### COOKIES Environment Variable (Optional)

If you want to download YouTube content that requires user authentication to download, you will need to add cookies to your configuration. One reason for needing this is to download members-only videos. Note that the source of these videos (channel, user, or playlist) still must be either public or unlisted. For members-only videos, I recommend going to the channel's home page and scrolling down to find an auto-generated playlist titled "Members-only videos" which will contain all the videos posted for members of the channel.

To generate this environment variable:

1. Download a browser extension (such as [this one](https://chrome.google.com/webstore/detail/open-cookiestxt/gdocmgbfkjnnpapoeobnolbbkoibbcif) for Chrome)
2. Log in to YouTube
3. With a YouTube tab open, open the cookies.txt extension and view the cookies as an HTTP header string
4. Copy the HTTP header string and use that value to set the environment variable COOKIES

### Playlists With New Items Added to the End

Note that for playlists, the podcast feed will return with the first 50 videos in the playlist (from the top). If the playlist has more than 50 videos and new videos are added to the end of the playlist, then the podcast feed may not include the newest videos. Unfortunately, YouTube's APIs make it cost-prohibitive to get the items at the end of long playlists. If you want to have these type of playlists in your podcast player, you can self-host this project (using the information above) and set the environment variable `ENABLE_PLAYLIST_SORTING=true`. Alternatively, if you are the creator of the playlist, you can set the playlist's sort order to newest on top.
