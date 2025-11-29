export const LangItem: React.FC<{ label: string; flag: string; active?: boolean }> = ({ label, flag, active }) => (
  <button
    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition ${active ? 'bg-blue-50 text-blue-600' : ''}`}
  >
    <span className="text-2xl">{flag}</span>
    <span>{label}</span>
    {active && <span className="ml-auto text-blue-600">✓</span>}
  </button>
);

export const SupportItem: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full cursor-pointer text-left px-5 py-3 hover:bg-gray-100 transition text-gray-700"
  >
    {label}
  </button>
);
