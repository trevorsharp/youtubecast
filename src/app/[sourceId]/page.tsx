import MainPage from '~/components/MainPage';

const Page = ({ params }: { params: { sourceId: string } }) => (
  <MainPage searchText={params.sourceId} />
);

export default Page;
