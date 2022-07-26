import { Source, Video } from '../types';

const searchForChannel = (searchText: string): Promise<string | null> => {
  return Promise.resolve('UCLtREJY21xRfCuEKvdki1Kw');
};

const getChannelDetails = (channelId: string): Promise<Source | null> => {
  return Promise.resolve({
    type: 'channel',
    id: 'UCLtREJY21xRfCuEKvdki1Kw',
    name: 'h3podcast',
    displayName: 'H3 Podcast',
    profileImageUrl:
      'https://yt3.ggpht.com/ytc/AKedOLQWUMY1y2rOUSpeJH5C09dZYmdbLlMUi1hkn6CB1g=s176-c-k-c0x00ffffff-no-rj',
    description: 'The official podcast of Ethan and Hila Klein of h3h3productions.',
  });
};

const getPlaylistDetails = (playlistId: string): Promise<Source | null> => {
  return Promise.resolve(null);
};

const getPlaylistIdForChannelUploads = (channelId: string): Promise<string | null> => {
  return Promise.resolve('123');
};

const getVideosForPlaylist = (playlistId: string): Promise<Video[]> => {
  return Promise.resolve([
    {
      id: '3tiiER1zHfE',
      title: "Well, it happened. He's finally banned. - H3TV #44",
      date: new Date().toISOString(),
      description:
        "Thank you to http://hellofresh.com/H3TV16 (use code: H3TV16) for sponsoring this episode!\n      TEDDY FRESH...http://teddyfresh.com\n      H3 MERCH! http://h3h3shop.com\n      \n      Follow us on Social Media:\n      https://twitter.com/theh3podcast\n      https://www.instagram.com/h3_podcast\n      \n      Follow Teddy Fresh Social Media:\n      https://teddyfresh.com\n      https://instagram.com/teddyfresh\n      https://twitter.com/teddyfresh\n      \n      0:00 Intro\n      3:10 GFuel & Ninja Memes\n      14:00 TF Drop\n      17:50 Ben Shaprio Hate's Gays\n      30:00 Chiropractor \n      36:40 Keemstar The Stalker\n      50:30 Austin McBroom Postponed His Fight \n      54:10 Court House Weirdo \n      55:00 James Charles Copium \n      1:04:10 Plastic Surgeon TikTok\n      1:13:30 Fresh & Fit Drama + Tate \n      1:23:50 Who's Ethan's Best Friend?\n      1:53:30 Ninja Donos\n      1:57:00 Google CEO Cucked by Elon Mussy\n      2:07:50 Ishowspeed Banned \n      2:23:30 Qatar Dude Perfect\n      2:36:00 Dan Jury Duty \n      2:41:00 Helen Keller",
      duration: 509760000,
      url: 'https://www.youtube.com/watch?v=3tiiER1zHfE',
    },
  ]);
};

export {
  searchForChannel,
  getChannelDetails,
  getPlaylistDetails,
  getPlaylistIdForChannelUploads,
  getVideosForPlaylist,
};
