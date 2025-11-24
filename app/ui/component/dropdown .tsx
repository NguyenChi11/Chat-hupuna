import React from 'react';

type DropdownProps = {
  options: string[];
  initialValue?: string;
  onChange?: (value: string) => void;
};

const Dropdown = ({ options, initialValue, onChange }: DropdownProps) => {
  return (
    <div className="relative w-auto">
      <select
        defaultValue={initialValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="
          w-auto inline-block rounded-md border border-gray-300 bg-white 
          text-black text-sm sm:text-base font-medium 
          py-2 px-3 pr-8 cursor-pointer outline-none 
          focus:border-blue-300
        "
      >
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
