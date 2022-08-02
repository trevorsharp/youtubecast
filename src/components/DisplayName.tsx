type DisplayNameProps = {
  text: string;
};

const getShortestWordLength = (text: string) =>
  text
    .split(' ')
    .sort((a, b) => a.length - b.length)
    .find(() => true)?.length ?? 0;

const DisplayName = ({ text }: DisplayNameProps) => (
  <p
    className={`text-4xl font-bold break-word ${text.length < 20 ? 'w-fit' : 'w-min'} ${
      text.length > 20 && getShortestWordLength(text) < 8 ? 'min-w-[16rem]' : ''
    }`}
  >
    {text.slice(0, Math.min(text.length, 38)) + ((text.length ?? 0) > 38 ? '...' : '')}
  </p>
);

export default DisplayName;
