export type SearchInputProps = {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    onSubmit?: () => void;
    clearable?: boolean;
};