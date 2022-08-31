import { Quality } from '../types';

type QualitySelectionProps = {
  selection: Quality;
  onSelect: (selection: Quality) => void;
};

const QualitySelection = ({ selection, onSelect }: QualitySelectionProps) => {
  return (
    <div className="flex gap-4">
      <RadioButton
        id="720p"
        label="720p"
        value={Quality.Default}
        checked={selection === Quality.Default}
        onClick={() => onSelect(Quality.Default)}
      />
      <RadioButton
        id="360p"
        label="360p"
        value={Quality.P360}
        checked={selection === Quality.P360}
        onClick={() => onSelect(Quality.P360)}
      />
      <RadioButton
        id="Audio"
        label="Audio Only"
        value={Quality.Audio}
        checked={selection === Quality.Audio}
        onClick={() => onSelect(Quality.Audio)}
      />
    </div>
  );
};

type RadioButtonProps = {
  label: string;
  id: string;
  value: any;
  checked: boolean;
  onClick: () => void;
};

const RadioButton = ({ label, ...props }: RadioButtonProps) => (
  <label className="flex cursor-pointer items-center">
    <input
      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-neutral-500 checked:border-youtube checked:ring-2 checked:ring-inset checked:ring-youtube normal:checked:ring-3"
      type="radio"
      name="quality"
      onChange={() => {}}
      {...props}
    />
    <span className="m-1" />
    <span className="peer-checked:text-youtube">{label}</span>
  </label>
);

export default QualitySelection;
