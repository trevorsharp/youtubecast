import { useState } from 'react';
import { Quality } from '~/types';

type RssLinksProps = {
  id: string;
  qualitySelection: Quality | 'VideoServer';
  excludeShorts: boolean;
  videoServer: string | undefined;
};

const RssLinks = ({ id, qualitySelection, excludeShorts, videoServer }: RssLinksProps) => {
  const [copiedText, setCopiedText] = useState<string>('');

  const getRssLink = () => {
    const searchParams = new URLSearchParams();

    switch (qualitySelection) {
      case 'VideoServer':
        if (videoServer) searchParams.append('videoServer', videoServer);
        break;

      case Quality.Default:
        break;

      default:
        searchParams.append('quality', qualitySelection.toString());
    }

    if (excludeShorts) searchParams.append('excludeShorts', '');

    return `${window.location.origin}/${id}/feed${searchParams.toString() ? '?' : ''}${searchParams
      .toString()
      .replace('excludeShorts=', 'excludeShorts')}`;
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
