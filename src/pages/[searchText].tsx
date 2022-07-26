import type { GetServerSideProps } from 'next/types';
import MainPage from '../components/MainPage';
import type { MainPageProps } from '../components/MainPage';
import { searchForSource } from '../services/sourceService';

const UserPage = ({ source, host, errorMessage }: MainPageProps) => (
  <MainPage source={source} host={host} errorMessage={errorMessage} />
);

const getServerSideProps: GetServerSideProps = async (context) => {
  const { query, req } = context;
  const { headers } = req;
  const { host } = headers;

  const searchText = !Array.isArray(query.searchText)
    ? query.searchText
    : query.searchText.length > 0
    ? query.searchText[0]
    : undefined;

  if (searchText) {
    try {
      const source = await searchForSource(decodeURI(searchText));
      return { props: { source, host } };
    } catch (errorMessage) {
      return { props: { errorMessage } };
    }
  }

  return { redirect: { destination: '/', permanent: false } };
};

export default UserPage;
export { getServerSideProps };
