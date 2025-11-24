import React, { useEffect } from 'react';

export function LoadingFull() {
  useEffect(() => {
    document.body.style.overflow = 'hidden'; // chặn scroll
    return () => {
      document.body.style.overflow = 'auto'; // trả lại scroll
    };
  }, []);
  return (
    <div
      className={`fixed top-0 left-0 z-[999999] 
    bg-black/50 
      flex items-center overflow-none justify-center w-full h-full`}
    >
      <div className="relative w-16 h-16">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`absolute w-4 h-4 bg-blue-500 rounded-full animate-dot ${
              i === 0 ? 'delay-0' : i === 1 ? 'delay-200' : i === 2 ? 'delay-400' : 'delay-600'
            }`}
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateX(20px)`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes dot {
          0%,
          25%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-dot {
          animation: dot 1s infinite linear;
        }
      `}</style>
    </div>
  );
}
