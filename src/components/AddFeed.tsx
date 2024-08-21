'use client';

import { useEffect, useState } from 'react';
import cookie from 'cookie';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { env } from '~/env';
import { Quality } from '~/types';
import getQualityFromString from '~/utils/getQualityFromString';
import getQualityString from '~/utils/getQualityString';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import ShortsSelection from './ShortsSelection';
import VideoServerInput from './VideoServerInput';

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
    videoServer || env.NEXT_PUBLIC_VIDEO_SERVER_ONLY ? Quality.VideoServer : Quality.Default,
  );
  const [excludeShorts, setExcludeShorts] = useState<boolean>(true);

  const videoServerParam = searchParams.get('videoServer');

  useEffect(() => {
    const videoServer = videoServerParam || cookie.parse(document.cookie)['videoServer'];

    if (videoServer) {
      setVideoServer(videoServer);
      setQualitySelection(Quality.VideoServer);
    }
  }, [videoServerParam]);

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
      {env.NEXT_PUBLIC_VIDEO_SERVER_ONLY ? (
        <VideoServerInput videoServer={videoServer} setVideoServer={setVideoServer} />
      ) : (
        <QualitySelection
          selection={qualitySelection}
          onSelect={onSetQualitySelection}
          videoServer={videoServer}
        />
      )}
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
