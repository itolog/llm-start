export interface ModelPickerProps {
  items: string[];
  onSelect: (model: string) => void;
  onCancel: () => void;
}
