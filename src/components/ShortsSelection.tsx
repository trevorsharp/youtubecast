type ShortsSelectionProps = {
  selection: boolean;
  onSelect: (selection: boolean) => void;
};

const ShortsSelection = ({ selection, onSelect }: ShortsSelectionProps) => {
  return (
    <div className="form-check flex gap-1">
      <input
        className="float-left mr-2 mt-1 h-4 w-4 cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white bg-contain bg-center bg-no-repeat align-top text-youtube transition duration-200 checked:border-youtube checked:bg-youtube focus:outline-none"
        type="checkbox"
        id="exclude-shorts"
        checked={selection}
        onChange={() => onSelect(!selection)}
      />
      <label className="inline-block cursor-pointer select-none" htmlFor="exclude-shorts">
        Exclude YouTube Shorts
      </label>
    </div>
  );
};

export default ShortsSelection;
