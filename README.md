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
version: '3'
services:
  youtubecast:
    image: trevorsharp/youtubecast:latest
    container_name: youtubecast
    restart: unless-stopped
    ports:
      - 80:3000
    environment:
      - "YOUTUBE_API_KEY=XXXXX"
```

Create a file named `docker-compose.yml` with the contents above. Add in your YouTube API key.
