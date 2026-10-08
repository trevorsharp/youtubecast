import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import getSearchText from '../utils/getSearchText';
import SearchInput from './SearchInput';

const Search = ({ initialSearch }: { initialSearch?: string }) => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setFocus } = useForm({
    resolver: zodResolver(z.object({ searchText: z.string() })),
    defaultValues: { searchText: initialSearch ?? '' },
  });

  useEffect(() => setFocus('searchText'), []);
  useEffect(() => setIsLoading(false), [initialSearch]);

  const onSubmit = handleSubmit((values) => {
    const searchText = getSearchText(values.searchText);
    if (searchText && searchText !== initialSearch) {
      setIsLoading(true);
      navigate({
        to: `/${searchText}`,
      });
    }
  });

  return (
    <>
      <form className="flex items-center gap-4" onSubmit={onSubmit}>
        <SearchInput {...register('searchText')} />
        <button type="submit">
          <img
            className="h-8 w-8 text-youtube"
            src={isLoading ? '/assets/loading.svg' : '/assets/next.svg'}
            alt="Submit"
          />
        </button>
      </form>
    </>
  );
};

export default Search;
