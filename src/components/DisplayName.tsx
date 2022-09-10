type DisplayNameProps = {
  text: string;
};

const DisplayName = ({ text }: DisplayNameProps) => (
  <p className={'break-word max-w-md text-4xl font-bold'}>
    {text.slice(0, Math.min(text.length, 38)) + ((text.length ?? 0) > 38 ? '...' : '')}
  </p>
);

export default DisplayName;
