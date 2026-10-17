interface Option<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange(value: T): void;
}

export function Dropdown<T extends string>({ label, value, options, onChange }: DropdownProps<T>) {
  return <label className="dropdown"><span>{label}</span>
    <select value={value} onChange={(event) => {
      const option = options.find((item) => item.value === event.target.value);
      if (option) onChange(option.value);
    }}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
