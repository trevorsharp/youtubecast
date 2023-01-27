const getPlaylistVideoIds = async (playlistId: string): Promise<string[] | undefined> => {
  try {
    const playlistRes: any = await fetch(
      `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId.trim())}`
    ).then((response) => response.text());

    const data = JSON.parse(playlistRes?.split('ytInitialData = ')[1]?.split(';</script>')[0]);

    const videoIds: string[] | undefined =
      data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents
        ?.map((x: any) => x?.playlistVideoRenderer?.videoId)
        .slice(0, 50);

    if (videoIds === undefined)
      console.log(`Could not find playlist items for playlist id ${playlistId}`);

    return videoIds;
  } catch (error) {
    console.log(error);
  }

  throw 'Sorry, something went wrong getting playlist items 🤷';
};

export { getPlaylistVideoIds };
