enum Quality {
  Default = 0,
  Audio = 1,
  P360 = 2,
}

type QualityString = 'Audio' | '360p' | '720p';

type Source = {
  type: 'channel' | 'playlist';
  id: string;
  displayName: string;
  profileImageUrl: string;
  description: string;
  url: string;
};

type Video = {
  id: string;
  title: string;
  date: string;
  description: string;
  url: string;
  duration: number;
  isYouTubeShort: boolean;
  isAvailable: boolean;
  isLive: boolean;
  isProcessing: boolean;
  isPrivate: boolean;
};

export { Quality };
export type { QualityString, Source, Video };
