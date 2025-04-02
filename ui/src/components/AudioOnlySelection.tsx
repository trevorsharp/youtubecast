type AudioOnlySelectionProps = {
  audioOnly: boolean;
  setAudioOnly: (previousValue: boolean) => boolean;
};

const AudioOnlySelection = ({ audioOnly, setAudioOnly }: AudioOnlySelectionProps) => (
  <div className="form-check flex gap-1">
    <input
      className="float-left mr-2 mt-1 h-4 w-4 cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white bg-contain bg-center bg-no-repeat align-top text-youtube transition duration-200 checked:border-youtube checked:bg-youtube focus:outline-none"
      type="checkbox"
      id="audio-only"
      checked={audioOnly}
      onChange={() => setAudioOnly((previousValue) => !previousValue)}
    />
    <label className="inline-block cursor-pointer select-none" htmlFor="audio-only">
      Audio Only
    </label>
  </div>
);

export default AudioOnlySelection;
