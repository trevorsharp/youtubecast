import { Quality } from '../types';

const QualitySelection = ({
  selection,
  onSelect,
}: {
  selection: Quality;
  onSelect: (selection: Quality) => void;
}) => {
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

const RadioButton = ({
  label,
  ...props
}: {
  label: string;
  id: string;
  value: any;
  checked: boolean;
  onClick: () => void;
}) => (
  <label className="flex items-center cursor-pointer">
    <input
      className="appearance-none peer rounded-full h-4 w-4 border-2 border-neutral-500 cursor-pointer checked:border-youtube normal:checked:ring-3 checked:ring-2 checked:ring-inset checked:ring-youtube"
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
