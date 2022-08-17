import clsx from 'clsx';

type DisplayNameProps = {
  text: string;
};

const hasMultipleShortWords = (text: string) =>
  text.split(' ').filter((x) => x.length < 8).length > 1;

const DisplayName = ({ text }: DisplayNameProps) => (
  <p
    className={clsx(
      'break-word text-4xl font-bold',
      text.length < 20 ? 'w-fit' : 'w-min',
      text.length > 20 && hasMultipleShortWords(text) && 'min-w-[16rem]'
    )}
  >
    {text.slice(0, Math.min(text.length, 38)) + ((text.length ?? 0) > 38 ? '...' : '')}
  </p>
);

export default DisplayName;
