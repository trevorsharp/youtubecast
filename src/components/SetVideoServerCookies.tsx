'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import getCookieWithMaxExpiration from '~/utils/getCookieWithMaxExpiration';

const SetVideoServerCookies = () => {
  const searchParams = useSearchParams();
  const setVideoServerParam = searchParams.get('setVideoServer');

  useEffect(() => {
    if (setVideoServerParam)
      document.cookie = getCookieWithMaxExpiration('videoServer', setVideoServerParam);
  }, [setVideoServerParam]);

  return <></>;
};

export default SetVideoServerCookies;
