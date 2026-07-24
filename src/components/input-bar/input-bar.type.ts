export interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Whether a translation is currently streaming — enables Esc-to-stop. */
  isLoading: boolean;
  /** Stops the running translation (Esc). */
  onCancel: () => void;
}
