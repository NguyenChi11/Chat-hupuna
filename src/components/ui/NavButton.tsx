// Reusable Components
export const NavButton: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  tooltip?: string;
}> = ({ icon, active, onClick, tooltip }) => (
  <button
    onClick={onClick}
    className={`cursor-pointer p-3 rounded-xl transition-all duration-200 group relative ${
      active ? 'bg-white/20 shadow-lg scale-110' : 'hover:bg-white/10 hover:scale-110'
    }`}
  >
    <div className="text-2xl">{icon}</div>
    {tooltip && (
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {tooltip}
      </span>
    )}
  </button>
);
