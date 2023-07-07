import { forwardRef, useState, useEffect } from 'react';

const topChannels = [
  'H3 Podcast',
  'MrBeast',
  'PewDiePie',
  'Bay Area Buggs',
  'Casey Neistat',
  'Marques Brownlee',
  'Snazzy Labs',
  'Mark Rober',
  'CGP Grey',
  'Wendover Productions',
];

const SearchInput = forwardRef<HTMLInputElement>((props, ref) => {
  const [inputPlaceholder, setInputPlaceholder] = useState<string>('');

  const animationTimeouts: NodeJS.Timeout[] = [];

  const animatePlaceholderText = () => {
    const channelList = topChannels.sort(() => 0.5 - Math.random());
    let timeout = 0;
    channelList.forEach((channel) => {
      channel.split('').forEach((_, i) => {
        animationTimeouts.push(
          setTimeout(() => setInputPlaceholder(channel.substring(0, i + 1)), timeout)
        );
        timeout += 200;
      });
      timeout += 2000;
    });
    animationTimeouts.push(setTimeout(() => animatePlaceholderText(), timeout));
  };

  useEffect(() => {
    animatePlaceholderText();
    return () => animationTimeouts.forEach((timeout) => clearTimeout(timeout));
  }, []);

  return (
    <input
      className="w-50 appearance-none rounded-lg border-2 border-solid border-youtube bg-inherit p-3 text-xl outline-none ring-youtube focus:border-youtube focus:ring-youtube"
      ref={ref}
      type="text"
      placeholder={inputPlaceholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
