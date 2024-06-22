import { useState } from 'react';
import getFeedUrlParams from '~/utils/getFeedUrlParams';
import type { Quality } from '~/types';

type RssLinksProps = {
  id: string;
  qualitySelection: Quality;
  excludeShorts: boolean;
  videoServer: string | undefined;
};

const RssLinks = ({ id, qualitySelection, excludeShorts, videoServer }: RssLinksProps) => {
  const [copiedText, setCopiedText] = useState<string>('');

  const getRssLink = ({ withProtocol }: { withProtocol: boolean } = { withProtocol: true }) => {
    const feedUrlParams = getFeedUrlParams(qualitySelection, excludeShorts, videoServer);

    return `${
      withProtocol ? window.location.origin : window.location.host
    }/${id}/feed${feedUrlParams}`;
  };

  const copyRssLink = () => {
    void navigator.clipboard.writeText(getRssLink()).then(() => {
      setCopiedText('Copied link to RSS feed 🎉');
      setTimeout(() => setCopiedText(''), 2000);
    });
  };

  return (
    <div className="flex h-24 flex-col items-center gap-6">
      <div className="flex gap-4">
        <a href={`podcast://${getRssLink({ withProtocol: false })}`}>
          <img className="h-10 w-10" src="/applepodcasts.svg" alt="Apple Podcasts" />
        </a>
        <a href={`pktc://subscribe/${getRssLink({ withProtocol: false })}`}>
          <img className="h-10 w-10" src="/pocketcasts.svg" alt="Pocket Casts" />
        </a>
        <img className="h-10 w-10 cursor-pointer" src="/rss.svg" alt="RSS" onClick={copyRssLink} />
      </div>
      {copiedText && <p>{copiedText}</p>}
    </div>
  );
};

export default RssLinks;
