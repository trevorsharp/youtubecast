import { Html, Head, Main, NextScript } from 'next/document';

const Document = () => (
  <Html lang="en" className="h-full normal:text-normal mobile:text-mobile text-tiny">
    <Head />
    <body className="bg-youtube h-full">
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
