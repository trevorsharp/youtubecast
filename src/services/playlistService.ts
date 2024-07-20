/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const getPlaylistVideoIds = async (playlistId: string) => {
  try {
    const playlistRes = await fetch(
      `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId.trim())}`,
    ).then((response) => response.text());

    const data = JSON.parse(
      playlistRes?.split('ytInitialData = ')[1]?.split(';</script>')[0] ?? '{}',
    );

    const videoIds: string[] | undefined =
      data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents
        ?.map((x: any) => x?.playlistVideoRenderer?.videoId)
        .slice(0, 50);

    if (videoIds === undefined) throw `Could not find playlist items for playlist id ${playlistId}`;

    return videoIds;
  } catch (error) {
    console.error(error);
  }

  throw 'Sorry, something went wrong getting playlist items 🤷';
};

export { getPlaylistVideoIds };
