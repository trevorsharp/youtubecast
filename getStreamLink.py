#!/usr/bin/python
import sys
from pytube import YouTube

youtubeLink = sys.argv[1]
quality = sys.argv[2]

yt = YouTube(youtubeLink)

if quality == '1':
   print(yt.streams.filter(only_audio=True, mime_type='audio/mp4').order_by('abr').desc().first().url)
elif quality == '2':
   print(yt.streams.filter(progressive=True, file_extension='mp4', resolution='360p').first().url)
else:
   print(yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first().url)