import MainPage from '~/components/MainPage';
import getSearchText from '~/utils/getSearchText';

const Page = ({ params }: { params: { sourceId: string } }) => (
  <MainPage searchText={getSearchText(params.sourceId)} />
);

export default Page;
