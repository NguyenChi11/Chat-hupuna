import React from 'react';

type ToggleSwitchProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

const ToggleSwitch = ({ checked = true, onChange }: ToggleSwitchProps) => {
  return (
    <label className="relative inline-block w-11 h-6 sm:w-12 sm:h-7 flex-shrink-0">
      <input
        type="checkbox"
        defaultChecked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="opacity-0 w-0 h-0 peer"
      />
      <span
        className="
          absolute cursor-pointer top-0 left-0 right-0 bottom-0 
          bg-gray-400 transition-colors duration-300 rounded-full
          peer-checked:bg-blue-600
          after:content-[''] after:absolute after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 
          after:left-[3px] sm:after:left-[4px] after:top-1/2 after:-translate-y-1/2
          after:bg-white after:rounded-full after:transition-transform after:duration-300
          peer-checked:after:translate-x-5
        "
      />
    </label>
  );
};

export default ToggleSwitch;
