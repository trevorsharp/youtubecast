import { useState } from 'react';
import cookie from 'cookie';
import { Quality } from '../types';

type RssLinksProps = {
  host: string | undefined;
  id: string;
  quality: Quality;
  excludeShorts: boolean;
  videoServer: string | undefined;
};

const RssLinks = ({ host, id, quality, excludeShorts, videoServer }: RssLinksProps) => {
  const [copiedText, setCopiedText] = useState<string>('');

  const getRssLink = () => {
    const searchParams = new URLSearchParams();

    if (typeof window !== 'undefined') {
      host = host ?? window.location.host;
      videoServer = videoServer ?? cookie.parse(document.cookie)['videoServer'];
    }

    if (quality != Quality.Default) searchParams.append('quality', quality.toString());
    if (excludeShorts) searchParams.append('excludeShorts', '');
    if (videoServer) searchParams.append('videoServer', videoServer);

    return `${host}/${id}/feed${searchParams.toString() ? '?' : ''}${searchParams
      .toString()
      .replace('excludeShorts=', 'excludeShorts')}`;
  };

  const copyRssLink = () => {
    navigator.clipboard.writeText(`http://${getRssLink()}`);
    setCopiedText('Copied link to RSS feed 🎉');
    setTimeout(() => setCopiedText(''), 2000);
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
