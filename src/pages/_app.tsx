import { useEffect, useState } from 'react';
import '~/styles/globals.css';
import { api } from '~/utils/api';
import type { AppType } from 'next/app';

const App: AppType = ({ Component, pageProps }) => {
  const [render, setRender] = useState(false);
  useEffect(() => setRender(true), []);
  return render ? <Component {...pageProps} /> : null;
};

export default api.withTRPC(App);
