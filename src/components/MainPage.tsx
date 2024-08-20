import Link from 'next/link';
import Search from './Search';
import SearchResult from './SearchResult';
import SetVideoServerCookies from './SetVideoServerCookies';

type MainPageProps = {
  searchText?: string;
};

const MainPage = ({ searchText }: MainPageProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-16 p-8 text-center">
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
    <Search initialSearch={searchText} />
    <SetVideoServerCookies />
    {searchText && <SearchResult searchText={searchText} />}
  </div>
);

export default MainPage;
