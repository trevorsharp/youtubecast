import { forwardRef } from 'react';

const SearchInput = forwardRef<HTMLInputElement>((props, ref) => (
  <input
    className="w-64 appearance-none rounded-lg border-2 border-solid border-youtube bg-inherit p-3 text-xl outline-none ring-youtube focus:border-youtube focus:ring-youtube"
    ref={ref}
    type="text"
    placeholder="Channel or Playlist"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    {...props}
  />
));

SearchInput.displayName = 'SearchInput';

export default SearchInput;
