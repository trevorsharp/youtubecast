'use client';

import { useState } from 'react';
import { Quality } from '~/types';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import ShortsSelection from './ShortsSelection';

type AddFeedProps = {
  sourceId: string;
  hostname: string;
};

const AddFeed = ({ sourceId, hostname }: AddFeedProps) => {
  const [qualitySelection, setQualitySelection] = useState<Quality>(Quality.Default);
  const [videoServer, setVideoServer] = useState<string | undefined>(undefined);
  const [excludeShorts, setExcludeShorts] = useState(true);

  return (
    <>
      <QualitySelection
        selection={qualitySelection}
        onSelect={setQualitySelection}
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
