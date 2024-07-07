'use client';

import { useEffect, useState } from 'react';
import cookie from 'cookie';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Quality } from '~/types';
import getCookieWithMaxExpiration from '~/utils/getCookieWithMaxExpiration';
import getQualityFromString from '~/utils/getQualityFromString';
import getQualityString from '~/utils/getQualityString';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import ShortsSelection from './ShortsSelection';

type AddFeedProps = {
  sourceId: string;
  hostname: string;
};

const AddFeed = ({ sourceId, hostname }: AddFeedProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [videoServer, setVideoServer] = useState<string | undefined>();
  const [qualitySelection, setQualitySelection] = useState<Quality>(
    videoServer ? Quality.VideoServer : Quality.Default,
  );
  const [excludeShorts, setExcludeShorts] = useState<boolean>(true);

  const videoServerParam = searchParams.get('videoServer');
  const setVideoServerParam = searchParams.get('setVideoServer');

  useEffect(() => {
    if (setVideoServerParam)
      document.cookie = getCookieWithMaxExpiration('videoServer', setVideoServerParam);

    const videoServer =
      setVideoServerParam || videoServerParam || cookie.parse(document.cookie)['videoServer'];

    if (videoServer) {
      setVideoServer(videoServer);
      setQualitySelection(Quality.VideoServer);
    }
  }, [videoServerParam, setVideoServerParam]);

  const qualityParam = searchParams.get('quality');

  useEffect(() => {
    if (qualityParam) setQualitySelection(getQualityFromString(qualityParam));
  }, [qualityParam]);

  const onSetQualitySelection = (quality: Quality) => {
    const searchParams = new URLSearchParams();

    searchParams.append('quality', getQualityString(quality));

    if (quality === Quality.VideoServer && videoServer) {
      searchParams.append('videoServer', videoServer);
    }

    router.push(`${pathname}?${searchParams.toString()}`);
  };

  return (
    <>
      <QualitySelection
        selection={qualitySelection}
        onSelect={onSetQualitySelection}
        videoServer={videoServer}
      />
      <ShortsSelection selection={excludeShorts} onSelect={setExcludeShorts} />
      <RssLinks
        sourceId={sourceId}
        quality={qualitySelection}
        excludeShorts={excludeShorts}
        videoServer={videoServer}
        hostname={hostname}
      />
    </>
  );
};

export default AddFeed;
