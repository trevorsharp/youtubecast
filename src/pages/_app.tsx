import { useEffect, useState } from 'react';
import { type AppType } from 'next/app';
import { api } from '~/utils/api';
import '~/styles/globals.css';

const App: AppType = ({ Component, pageProps }) => {
  const [render, setRender] = useState(false);
  useEffect(() => setRender(true), []);
  return render ? <Component {...pageProps} /> : null;
};

export default api.withTRPC(App);
