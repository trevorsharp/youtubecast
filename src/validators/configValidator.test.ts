import { describe, expect, test } from 'bun:test';
import configValidator from './configValidator';

const baseConfig = {
  youtubeApiKey: 'test-key',
  downloadVideos: false,
};

describe('configValidator', () => {
  test('applies the documented defaults', () => {
    const config = configValidator.parse(baseConfig);

    expect(config.maximumCompatibility).toBe(false);
    expect(config.cacheTimeToLive).toBe(1200);
    expect(config.minimumVideoDuration).toBe(180);
  });

  test('ignores unknown keys such as the removed highestQuality option', () => {
    const config = configValidator.parse({ ...baseConfig, highestQuality: true });

    expect(config).not.toHaveProperty('highestQuality');
  });

  test('requires a YouTube API key', () => {
    expect(() => configValidator.parse({ downloadVideos: false })).toThrow();
  });

  test('rejects maximumCompatibility without downloads', () => {
    expect(() => configValidator.parse({ ...baseConfig, downloadVideos: false, maximumCompatibility: true })).toThrow();
  });

  test('accepts maximumCompatibility with downloads enabled', () => {
    const config = configValidator.parse({ ...baseConfig, downloadVideos: true, maximumCompatibility: true });

    expect(config.maximumCompatibility).toBe(true);
  });

  test('accepts maxItems between 1 and 5000', () => {
    const config = configValidator.parse({ ...baseConfig, maxItems: 50 });

    expect(config.maxItems).toBe(50);
  });

  test('rejects maxItems outside the allowed range', () => {
    expect(() => configValidator.parse({ ...baseConfig, maxItems: 0 })).toThrow();
    expect(() => configValidator.parse({ ...baseConfig, maxItems: 5001 })).toThrow();
    expect(() => configValidator.parse({ ...baseConfig, maxItems: 1.5 })).toThrow();
  });
});
