import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import cookie from 'cookie';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { Quality } from '~/types';
import { api } from '~/utils/api';
import getCookieWithMaxExpiration from '~/utils/getCookieWithMaxExpiration';
import getQualityFromString from '~/utils/getQualityFromString';
import getQualityString from '~/utils/getQualityString';
import getSearchText from '~/utils/getSearchText';
import DisplayName from './DisplayName';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import SearchInput from './SearchInput';
import ExcludeShortsSelection from './ShortsSelection';

const MainPage = () => {
  const router = useRouter();

  const [videoServer, setVideoServer] = useState<string | undefined>();

  const [qualitySelection, setQualitySelection] = useState<Quality>(
    videoServer ? Quality.VideoServer : Quality.Default
  );

  const [excludeShorts, setExcludeShorts] = useState<boolean>(true);

  const searchText = getSearchText(router.asPath);

  const source = api.source.getSourceData.useQuery(
    { searchText },
    { enabled: !!searchText, retry: false }
  );

  const { register, handleSubmit, setFocus, setValue } = useForm({
    resolver: zodResolver(z.object({ searchText: z.string() })),
    defaultValues: { searchText },
  });

  useEffect(() => setFocus('searchText'), []);

  useEffect(() => setValue('searchText', searchText), [searchText]);

  useEffect(() => {
    if (typeof router.query.setVideoServer === 'string')
      document.cookie = getCookieWithMaxExpiration('videoServer', router.query.setVideoServer);

    const videoServer =
      typeof router.query.setVideoServer === 'string'
        ? router.query.setVideoServer
        : typeof router.query.videoServer === 'string'
        ? router.query.videoServer
        : cookie.parse(document.cookie)['videoServer'];

    if (videoServer) {
      setVideoServer(videoServer);
      setQualitySelection(Quality.VideoServer);
    }
  }, [router.query.videoServer, router.query.setVideoServer]);

  useEffect(() => {
    if (typeof router.query.quality === 'string')
      setQualitySelection(getQualityFromString(router.query.quality));
  }, [router.query.quality]);

  const onSubmit = handleSubmit(async (values) => {
    if (values.searchText) {
      await router.push(`/${getSearchText(values.searchText)}`, undefined, { scroll: false });
    }
  });

  const onSetQualitySelection = async (quality: Quality) => {
    const searchParams = new URLSearchParams();

    searchParams.append('quality', getQualityString(quality));

    if (quality === Quality.VideoServer && videoServer) {
      searchParams.append('videoServer', videoServer);
    }

    await router.replace(`/${searchText}?${searchParams.toString()}`, undefined, {
      shallow: true,
    });
  };

  return (
    <>
      <Head>
        <title>YouTubeCast</title>
      </Head>

      <div className="flex min-h-screen flex-col items-center justify-center gap-16 px-4 py-12 text-center">
        <h1 className="flex flex-col text-7xl font-bold">
          <span>Welcome to</span>
          <span className="text-youtube">
            <Link href="/">YouTubeCast</Link>
          </span>
        </h1>
        <p className="flex flex-col text-2xl">
          <span>Generate podcast feeds for your</span>
          <span>
            favorite <span className="text-youtube">YouTube</span> content
          </span>
        </p>
        <form className="flex items-center gap-4" onSubmit={onSubmit}>
          <SearchInput {...register('searchText')} />
          <button type="submit">
            <img
              className="h-8 w-8 text-youtube"
              src={searchText && source.isLoading ? '/loading.svg' : '/next.svg'}
              alt="Submit"
            />
          </button>
        </form>
        {source.data && (
          <div className="flex flex-col items-center gap-8">
            <a className="flex items-center gap-4" target="_new" href={source.data.url}>
              <img
                className="h-16 w-16 rounded-full"
                src={source.data.profileImageUrl}
                alt="Profile"
              />
              <DisplayName text={source.data.displayName} />
            </a>
            <div className="flex flex-col items-center gap-4">
              <QualitySelection
                selection={qualitySelection}
                videoServer={videoServer}
                onSelect={onSetQualitySelection}
              />
              <ExcludeShortsSelection selection={excludeShorts} onSelect={setExcludeShorts} />
            </div>
            <RssLinks
              id={source.data.id}
              qualitySelection={qualitySelection}
              excludeShorts={excludeShorts}
              videoServer={videoServer}
            />
          </div>
        )}
        {source.error && <p>{source.error.message}</p>}
      </div>
    </>
  );
};

export default MainPage;
