type VideoServerInputProps = {
  videoServer: string | undefined;
  setVideoServer: (videoServer: string) => void;
};

const VideoServerInput = ({ videoServer, setVideoServer }: VideoServerInputProps) => {
  return (
    <div className="flex items-start gap-3">
      <input
        className="w-72 appearance-none rounded-lg border-2 border-solid border-youtube bg-inherit p-3 text-xl outline-none ring-youtube focus:border-youtube focus:ring-youtube"
        type="text"
        placeholder="Video Server"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        defaultValue={videoServer}
        onChange={(e) => setVideoServer(e.target.value)}
      />
      <a
        href="https://github.com/trevorsharp/youtubecast-videoserver/blob/main/setup.md"
        target="_blank"
      >
        <img className="h-6 w-5 pt-1 text-youtube" src={'/questionmark.svg'} alt="What's this?" />
      </a>
    </div>
  );
};

export default VideoServerInput;
