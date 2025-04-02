/* eslint-disable no-unexpected-multiline */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Sourced from https://github.com/appit-online/youtube-search

const searchChannels = async (searchQuery: string) => {
  try {
    const searchRes: any = await fetch(
      `https://www.youtube.com/results?q=${encodeURIComponent(searchQuery.trim())}&hl=en&sp=EgIQAg%253D%253D`,
    ).then((response) => response.text());

    let html = searchRes;

    try {
      const data = html.split("ytInitialData = '")[1].split("';</script>")[0];
      html = data.replace(/\\x([0-9A-F]{2})/gi, (...items: any[]) => String.fromCharCode(parseInt(items[1], 16)));
      html = html.replaceAll('\\\\"', '');
      html = JSON.parse(html);
    } catch {
      /* empty */
    }

    let details: any[] | undefined;

    if (
      html?.contents?.sectionListRenderer?.contents &&
      html.contents.sectionListRenderer.contents.length > 0 &&
      html.contents.sectionListRenderer.contents[0].itemSectionRenderer?.contents &&
      html.contents.sectionListRenderer.contents[0].itemSectionRenderer.contents.length > 0
    ) {
      details = html.contents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
    }

    if (!details) {
      try {
        details = JSON.parse(
          html
            .split('{"itemSectionRenderer":{"contents":')
            [html.split('{"itemSectionRenderer":{"contents":').length - 1].split(',"continuations":[{')[0],
        );
      } catch {
        /* empty */
      }
    }

    if (!details) {
      try {
        details = JSON.parse(
          html
            .split('{"itemSectionRenderer":')
            [html.split('{"itemSectionRenderer":').length - 1].split('},{"continuationItemRenderer":{')[0],
        ).contents;
      } catch {
        /* empty */
      }
    }

    if (details)
      return details.find((detail) => detail.channelRenderer?.channelId).channelRenderer.channelId as
        | string
        | undefined;
  } catch (error) {
    console.error(error);
  }

  throw 'Sorry, something went wrong with your search 🤷';
};

export default { searchChannels };
