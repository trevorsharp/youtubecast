'use client';

import { useState } from 'react';
import { Quality } from '~/types';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';

type AddFeedProps = {
  sourceId: string;
  hostname: string;
};

const AddFeed = ({ sourceId, hostname }: AddFeedProps) => {
  const [qualitySelection, setQualitySelection] = useState<Quality>(Quality.Default);

  return (
    <>
      <QualitySelection selection={qualitySelection} onSelect={setQualitySelection} />
      <RssLinks sourceId={sourceId} quality={qualitySelection} hostname={hostname} />
    </>
  );
};

export default AddFeed;
