import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SearchInput from './SearchInput';
import QualitySelection from './QualitySelection';
import RssLinks from './RssLinks';
import DisplayName from './DisplayName';
import { Quality, Source } from '../types';

type MainPageProps = {
  searchText?: string;
  source?: Source;
  errorMessage?: string;
  host?: string;
};

const MainPage = ({ searchText, source, errorMessage, host }: MainPageProps) => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [qualitySelection, setQualitySelection] = useState<Quality>(Quality.Default);

  const { register, handleSubmit, setFocus } = useForm({
    resolver: zodResolver(z.object({ searchText: z.string() })),
    defaultValues: { searchText },
  });

  useEffect(() => {
    setFocus('searchText');
  }, []);

  const onSubmit = handleSubmit((values) => {
    if (values.searchText) {
      setIsLoading(true);
      router
        .push(`/${encodeURIComponent(values.searchText)}`, undefined, { scroll: false })
        .then(() => setIsLoading(false));
    }
  });

  return (
    <>
      <Head>
        <title>YouTubeCast</title>
        <meta name="description" content="Create podcast feeds from YouTube channels" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="112x112" href="/apple-touch-icon.png" />
      </Head>

      <main className="h-full min-h-fit bg-white text-neutral-800 dark:bg-neutral-900 dark:text-white">
        <div className="flex h-full min-h-fit flex-col items-center justify-center gap-16 p-8 text-center">
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
                src={isLoading ? '/loading.svg' : '/next.svg'}
                alt="Submit"
              />
            </button>
          </form>
          {source && (
            <div className="flex flex-col items-center gap-6">
              <a className="flex items-center gap-4" target="_new" href={source.url}>
                <img
                  className="h-16 w-16 rounded-full"
                  src={source.profileImageUrl}
                  alt="Profile"
                />
                <DisplayName text={source.displayName} />
              </a>
              <QualitySelection selection={qualitySelection} onSelect={setQualitySelection} />
              <RssLinks
                host={host ?? window.location.host}
                id={source.id}
                quality={qualitySelection}
              />
            </div>
          )}
          {errorMessage && <p>{errorMessage}</p>}
        </div>
      </main>
    </>
  );
};

export default MainPage;
export type { MainPageProps };
