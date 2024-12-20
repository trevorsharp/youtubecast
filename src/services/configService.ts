const getConfig = async () => {
  return new Promise<{ youtubeApiKey: string }>((resolve) =>
    resolve({
      youtubeApiKey: '',
    }),
  );
};

export default { getConfig };
