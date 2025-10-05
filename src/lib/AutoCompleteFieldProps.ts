export interface AutoCompleteComponentProps {
  items?: string[];
  value?: string;
  onChange?: (value: string | null) => void;
  onSearch?: (query: string) => Promise<string[]> | string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
}
