'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import SearchInput from './SearchInput';

const Search = ({ initialSearch }: { initialSearch?: string }) => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setFocus } = useForm({
    resolver: zodResolver(z.object({ searchText: z.string() })),
    defaultValues: { searchText: initialSearch },
  });

  useEffect(() => setFocus('searchText'), []);

  const onSubmit = handleSubmit((values) => {
    if (values.searchText && values.searchText !== initialSearch) {
      setIsLoading(true);
      router.push(values.searchText, { scroll: false });
    }
  });

  return (
    <>
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
    </>
  );
};

export default Search;
