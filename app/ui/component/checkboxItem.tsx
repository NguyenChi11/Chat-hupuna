import React from 'react';
import IconTK from '@/public/icons/tick.svg';

type CheckboxItemProps = {
  _id: string;
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

const CheckboxItem = ({ _id, label, checked = true, onChange }: CheckboxItemProps) => {
  return (
    <div className="flex items-center py-2 sm:py-3 px-3 sm:px-5 cursor-pointer">
      <input
        type="checkbox"
        id={_id}
        defaultChecked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer hidden"
      />
      <div
        className="
          h-5 w-5 border-2 border-black rounded-md flex items-center justify-center 
          peer-checked:border-blue-600 peer-checked:bg-blue-600 transition
        "
      >
        <img src={IconTK.src} alt="Tick" className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <label
        htmlFor={_id}
        className="ml-2 sm:ml-3 text-sm sm:text-base font-medium text-black flex-grow cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
};

export default CheckboxItem;
