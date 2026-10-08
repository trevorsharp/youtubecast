import { useState } from 'react';

type RssLinksProps = {
  feedId: string;
};

const RssLinks = ({ feedId }: RssLinksProps) => {
  const [copiedText, setCopiedText] = useState<string>('');
  const [audioOnly, setAudioOnly] = useState(false);

  const getRssLink = () => `${window.location.hostname}/${feedId}/feed${audioOnly ? '?audioOnly' : ''}`;

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
          <img className="h-10 w-10" src="/assets/applepodcasts.svg" alt="Apple Podcasts" />
        </a>
        <a href={`pktc://subscribe/${getRssLink()}`}>
          <img className="h-10 w-10" src="/assets/pocketcasts.svg" alt="Pocket Casts" />
        </a>
        <img className="h-10 w-10 cursor-pointer" src="/assets/rss.svg" alt="RSS" onClick={copyRssLink} />
      </div>
      <div className="form-check flex gap-2">
        <input
          className="mt-1 h-4 w-4 cursor-pointer accent-youtube"
          type="checkbox"
          id="audio-only"
          checked={audioOnly}
          onChange={() => setAudioOnly((previousValue) => !previousValue)}
        />
        <label className="inline-block cursor-pointer select-none" htmlFor="audio-only">
          Audio Only
        </label>
      </div>
      {copiedText && <p>{copiedText}</p>}
    </div>
  );
};

export default RssLinks;
