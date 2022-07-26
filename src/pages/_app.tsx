import '../globals.css';
import type { AppType } from 'next/dist/shared/lib/utils';

const App: AppType = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

export default App;
