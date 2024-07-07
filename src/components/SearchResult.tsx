import { headers } from 'next/headers';
import { searchForSource } from '~/services/sourceService';
import AddFeed from './AddFeed';
import DisplayName from './DisplayName';

type SearchResultProps = {
  searchText: string;
};

const SearchResult = async ({ searchText }: SearchResultProps) => {
  try {
    const source = await searchForSource(searchText);

    return (
      <div className="flex flex-col items-center gap-6">
        <a className="flex items-center gap-4" target="_new" href={source.url}>
          <img className="h-16 w-16 rounded-full" src={source.profileImageUrl} alt="Profile" />
          <DisplayName text={source.displayName} />
        </a>
        <AddFeed sourceId={source.id} hostname={headers().get('host') ?? ''} />
      </div>
    );
  } catch (errorMessage) {
    return <p>{errorMessage as string}</p>;
  }
};

export default SearchResult;
