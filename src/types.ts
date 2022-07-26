enum Quality {
  Default = 0,
  Audio = 1,
  P360 = 2,
}

type Source = {
  type: 'channel';
  id: string;
  name: string;
  displayName: string;
  profileImageUrl: string;
  description: string;
};

type Video = {
  id: string;
  title: string;
  date: string;
  description: string;
  duration: number;
  url: string;
};

export { Quality };
export type { Source, Video };
