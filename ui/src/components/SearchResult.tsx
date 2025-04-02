import { indexRoute } from '../routes';
import RssLinks from './RssLinks';

const SearchResult = () => {
  const feedData = indexRoute.useLoaderData();

  if (!feedData) {
    return <p>Failed to search for channel or playlist</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <a className="flex items-center gap-4" target="_new" href={feedData.link}>
        <img className="h-16 w-16 rounded-full" src={feedData.imageUrl} alt="Profile" />
        <p className="max-w-md text-4xl font-bold whitespace-nowrap truncate">{feedData.name}</p>
      </a>
      <RssLinks feedId={feedData.id} />
    </div>
  );
};

export default SearchResult;
