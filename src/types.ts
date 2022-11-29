enum Quality {
  Default = 0,
  Audio = 1,
  P360 = 2,
}

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
};

export { Quality };
export type { Source, Video };
