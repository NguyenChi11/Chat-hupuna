import React from 'react';

type RadioItemProps<T> = {
  label: string;
  value: T;
  selectedValue: T;
  onChange: (value: T) => void;
};

const RadioItem = <T extends string>({ label, value, selectedValue, onChange }: RadioItemProps<T>) => {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-gray-900">{label}</span>
      <input
        type="radio"
        name="excelDisplay"
        value={value}
        checked={selectedValue === value}
        onChange={() => onChange(value)}
        className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
      />
    </label>
  );
};

export default RadioItem;
