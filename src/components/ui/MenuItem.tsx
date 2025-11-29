export const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ icon, label, trailing, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full cursor-pointer flex items-center justify-between px-5 py-3 hover:bg-gray-100 transition-all ${className}`}
  >
    <div className="flex items-center gap-4">
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
    {trailing && <span className="text-gray-500">{trailing}</span>}
  </button>
);
