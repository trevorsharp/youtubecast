import type { GetServerSideProps } from 'next/types';
import cookie from 'cookie';
import MainPage from '../components/MainPage';
import type { MainPageProps } from '../components/MainPage';
import { searchForSource } from '../services/sourceService';

const UserPage = (props: MainPageProps) => <MainPage {...props} />;

const getServerSideProps: GetServerSideProps = async (context) => {
  const { query, req, res } = context;
  const { headers } = req;
  const { host, cookie: clientCookie } = headers;

  const searchText = !Array.isArray(query.searchText)
    ? query.searchText
    : query.searchText.length > 0
    ? query.searchText[0]
    : undefined;

  const videoServer = clientCookie ? cookie.parse(clientCookie)['videoServer'] : undefined;

  if (searchText) {
    try {
      const source = await searchForSource(decodeURI(searchText));
      res.setHeader('Cache-Control', 's-maxage=86400');
      return { props: JSON.parse(JSON.stringify({ source, host, searchText, videoServer })) };
    } catch (errorMessage) {
      return { props: JSON.parse(JSON.stringify({ errorMessage, searchText })) };
    }
  }

  return { redirect: { destination: '/', permanent: false } };
};

export default UserPage;
export { getServerSideProps };
