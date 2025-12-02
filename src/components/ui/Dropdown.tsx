import { HiCheck, HiChevronDown } from 'react-icons/hi2';

export function Dropdown({
  label,
  icon,
  items,
  open,
  onToggle,
  onSelect,
  value,
  placeholder = 'Chọn một mục',
  className = '',
}: {
  label?: string;
  icon?: React.ReactNode;
  items: { value: string; label: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
  value: string;
  placeholder?: string;
  className?: string;
}) {
  const selectedLabel = items.find((i) => i.value === value)?.label || '';

  return (
    <div className="relative">
      {/* Label nếu có */}
      {label && (
        <label className=" text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          {icon}
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 
          bg-white text-left text-lg font-medium transition-all
          flex items-center justify-between
          focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100
          hover:border-gray-300
          ${open ? 'border-indigo-500 ring-4 ring-indigo-100' : ''}
          ${className}
        `}
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>{selectedLabel || placeholder}</span>
        <HiChevronDown
          className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Icon bên trái */}
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">{icon}</div>}

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-30 w-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-64 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  onSelect(item.value);
                  onToggle();
                }}
                className={`
                  w-full px-5 py-4 text-left text-lg font-medium flex items-center justify-between
                  transition-all duration-150 hover:bg-indigo-50
                  ${value === item.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'}
                `}
              >
                <span>{item.label}</span>
                {value === item.value && <HiCheck className="w-6 h-6 text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
