'use client';

import { useState } from 'react';
import getFeedUrlParams from '~/utils/getFeedUrlParams';
import type { Quality } from '~/types';

type RssLinksProps = {
  sourceId: string;
  quality: Quality;
  excludeShorts: boolean;
  videoServer: string | undefined;
  hostname: string;
};

const RssLinks = ({ sourceId, quality, excludeShorts, videoServer, hostname }: RssLinksProps) => {
  const [copiedText, setCopiedText] = useState<string>('');

  const getRssLink = () =>
    `${hostname}/${sourceId}/feed${getFeedUrlParams(quality, excludeShorts, videoServer)}`;

  const copyRssLink = () => {
    void navigator.clipboard.writeText(`http://${getRssLink()}`).then(() => {
      setCopiedText('Copied link to RSS feed 🎉');
      setTimeout(() => setCopiedText(''), 2000);
    });
  };

  return (
    <div className="flex h-24 flex-col items-center gap-6">
      <div className="flex gap-4">
        <a href={`podcast://${getRssLink()}`}>
          <img className="h-10 w-10" src="/applepodcasts.svg" alt="Apple Podcasts" />
        </a>
        <a href={`pktc://subscribe/${getRssLink()}`}>
          <img className="h-10 w-10" src="/pocketcasts.svg" alt="Pocket Casts" />
        </a>
        <img className="h-10 w-10 cursor-pointer" src="/rss.svg" alt="RSS" onClick={copyRssLink} />
      </div>
      {copiedText && <p>{copiedText}</p>}
    </div>
  );
};

export default RssLinks;
