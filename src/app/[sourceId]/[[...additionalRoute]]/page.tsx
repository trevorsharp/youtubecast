import MainPage from '~/components/MainPage';
import getSearchText from '~/utils/getSearchText';

const Page = ({ params }: { params: { sourceId: string, additionalRoute?: string[] } }) => (
  <MainPage searchText={getSearchText([params.sourceId, ...params.additionalRoute ?? []].join('/'))} />
);

export default Page;
