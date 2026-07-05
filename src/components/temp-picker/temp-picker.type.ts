export interface TempPickerProps {
  initial: number;
  onSelect: (temp: number) => void;
  onCancel: () => void;
}
