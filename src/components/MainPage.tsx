/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import cookie from 'cookie';
import SearchInput from './SearchInput';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import DisplayName from './DisplayName';
import ExcludeShortsSelection from './ShortsSelection';
import { Quality } from '~/types';
import { api } from '~/utils/api';

const MainPage = () => {
  const router = useRouter();

  const saveVideoServer =
    typeof router.query.setVideoServer === 'string' ? router.query.setVideoServer : undefined;

  if (saveVideoServer)
    document.cookie = cookie.serialize('videoServer', saveVideoServer, {
      expires: new Date('2038-01-01'),
    });

  const videoServer = cookie.parse(document.cookie)['videoServer'];

  const getSearchText = () => {
    const [path, path2] = window.location.pathname
      .split('/')
      .filter((segment) => segment)
      .map((segment) => decodeURI(segment));

    if (path === 'channel' || path === 'c' || path === 'user') return path2;

    if (path === 'playlist' || path === 'watch')
      return typeof router.query.list === 'string' ? router.query.list : undefined;

    return path;
  };

  const searchText = getSearchText() ?? '';

  const [qualitySelection, setQualitySelection] = useState<Quality | 'VideoServer'>(
    videoServer ? 'VideoServer' : Quality.Default
  );
  const [excludeShorts, setExcludeShorts] = useState<boolean>(false);

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

  const onSubmit = handleSubmit(async (values) => {
    if (values.searchText) await router.push(`/${values.searchText}`, undefined, { scroll: false });
  });

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
                onSelect={setQualitySelection}
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
