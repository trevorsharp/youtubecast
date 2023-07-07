import { Quality } from '~/types';

type QualitySelectionProps = {
  selection: Quality | 'VideoServer';
  videoServer: string | undefined;
  onSelect: (selection: Quality | 'VideoServer') => void;
};

const QualitySelection = ({ selection, videoServer, onSelect }: QualitySelectionProps) => {
  return (
    <div className="flex flex-col gap-2">
      {videoServer && (
        <div className="flex justify-center gap-4">
          <RadioButton
            id="VideoServer"
            label={`Video Server - ${videoServer}`}
            value={Quality.Audio}
            checked={selection === 'VideoServer'}
            onClick={() => onSelect('VideoServer')}
          />
        </div>
      )}
      <div className="flex justify-center gap-4">
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
    </div>
  );
};

type RadioButtonProps<TValue extends string | number> = {
  label: string;
  id: string;
  value: TValue;
  checked: boolean;
  onClick: () => void;
};

const RadioButton = <TValue extends string | number>({
  label,
  ...props
}: RadioButtonProps<TValue>) => (
  <label className="flex cursor-pointer items-center">
    <input
      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-neutral-500 checked:border-youtube checked:ring-2 checked:ring-inset checked:ring-youtube normal:checked:ring-3"
      type="radio"
      name="quality"
      onChange={(e) => e.stopPropagation()}
      {...props}
    />
    <span className="m-1" />
    <span className="select-none peer-checked:text-youtube">{label}</span>
  </label>
);

export default QualitySelection;
