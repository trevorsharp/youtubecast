const getSearchText = (rawSearch: string) => {
  const [path, path2] = rawSearch
    .replace(/(.*)youtube\.com\//, '')
    .replace(/(.*)list=/, '')
    .replace('%40', '@')
    .split('/')
    .filter((segment) => segment)
    .map((segment) => decodeURI(segment));

  if ((path === 'channel' || path === 'c' || path === 'user') && path2) return path2;

  return path ?? '';
};

export default getSearchText;
