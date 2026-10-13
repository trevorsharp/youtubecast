import { describe, expect, test } from 'bun:test';
import getSearchText from './getSearchText';

describe('getSearchText', () => {
  test('extracts a channel id from a channel URL', () => {
    expect(getSearchText('https://www.youtube.com/channel/UCabc123')).toBe('UCabc123');
  });

  test('extracts a handle from an @ URL', () => {
    expect(getSearchText('https://www.youtube.com/@somechannel')).toBe('@somechannel');
  });

  test('extracts a playlist id from a list query parameter', () => {
    expect(getSearchText('https://www.youtube.com/playlist?list=PLabc123')).toBe('PLabc123');
  });

  test('returns plain text unchanged', () => {
    expect(getSearchText('Some Channel')).toBe('Some Channel');
  });
});
