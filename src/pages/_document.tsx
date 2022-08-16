import { Html, Head, Main, NextScript } from 'next/document';

const Document = () => (
  <Html lang="en" className="h-full text-base tiny:text-tiny mobile:text-mobile normal:text-normal">
    <Head />
    <body className="h-full bg-youtube">
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
