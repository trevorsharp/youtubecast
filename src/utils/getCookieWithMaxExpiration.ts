import cookie from 'cookie';

const getCookieWithMaxExpiration = (key: string, value: string) =>
  cookie.serialize(key, value, {
    expires: new Date('2038-01-01'),
  });

export default getCookieWithMaxExpiration;
