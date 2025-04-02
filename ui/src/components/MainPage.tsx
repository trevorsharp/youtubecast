import Search from './Search';
import SearchResult from './SearchResult';
import { indexRoute } from '../routes';

const MainPage = () => {
  const { _splat: searchText } = indexRoute.useParams();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-16 p-8 text-center">
      <h1 className="flex flex-col text-7xl font-bold">
        <span>Welcome to</span>
        <span className="text-youtube">
          <a href="/">YouTubeCast</a>
        </span>
      </h1>
      <p className="flex flex-col text-2xl">
        <span>Generate podcast feeds for your</span>
        <span>
          favorite <span className="text-youtube">YouTube</span> content
        </span>
      </p>
      <Search initialSearch={searchText} />
      {searchText && <SearchResult />}
    </div>
  );
};

export default MainPage;
