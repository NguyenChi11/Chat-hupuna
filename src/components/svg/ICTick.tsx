import React from 'react';

const ICTick = ({ className, stroke }: { className?: string; stroke?: string }) => {
  return (
    <div>
      <svg
        className={className}
        width="800px"
        height="800px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.29417 12.9577L10.5048 16.1681L17.6729 9"
          stroke={stroke || '#000000'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="10" stroke={stroke || '#000000'} stroke-width="2" />
      </svg>
    </div>
  );
};

export default ICTick;
