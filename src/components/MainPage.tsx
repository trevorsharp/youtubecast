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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#fa0000" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="112x112" href="/apple-touch-icon.png" />
      </Head>

      <main className="h-full min-h-fit bg-white text-neutral-800 dark:bg-neutral-900 dark:text-white">
        <div className="flex flex-col items-center justify-center gap-16 p-8 h-full min-h-fit">
          <div className="flex flex-col items-center gap-16 text-center max-w-md">
            <h1 className="text-7xl font-bold">
              Welcome to{' '}
              <span className="text-youtube">
                <Link href="/">YouTubeCast</Link>
              </span>
            </h1>
            <p className="text-2xl">
              <span className="inline-block">Generate podcast feeds for your&nbsp;</span>
              <span className="inline-block">
                favorite <span className="text-youtube">YouTube</span> content
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-12 items-center transition duration-200">
            <form className="flex gap-4 items-center" onSubmit={onSubmit}>
              <SearchInput {...register('searchText')} />
              <button type="submit">
                <img
                  className="w-8 h-8 text-youtube"
                  src={isLoading ? '/loading.svg' : '/next.svg'}
                  alt="Submit"
                />
              </button>
            </form>

            {(source || errorMessage) && (
              <div className="flex flex-col gap-6 items-center">
                {source && (
                  <>
                    <a className="flex gap-4 items-center" target="_new" href={source.url}>
                      <img
                        className="rounded-full w-16 h-16"
                        src={source.profileImageUrl}
                        alt="Profile"
                      />
                      <p className="text-4xl font-bold">{source.displayName}</p>
                    </a>
                    <QualitySelection selection={qualitySelection} onSelect={setQualitySelection} />
                    <RssLinks
                      host={host ?? window.location.host}
                      id={source.id}
                      quality={qualitySelection}
                    />
                  </>
                )}
                {errorMessage && <p>{errorMessage}</p>}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default MainPage;
export type { MainPageProps };
