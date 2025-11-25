import React from 'react';

const ICBack = ({ className, stroke }: { className?: string; stroke?: string }) => {
  return (
    <div>
      <svg
        className={className}
        width="800px"
        height="800px"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        fill={stroke || '#000000'}
        stroke={stroke || '#000000'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100,15a85,85,0,1,0,85,85A84.93,84.93,0,0,0,100,15Zm0,150a65,65,0,1,1,65-65A64.87,64.87,0,0,1,100,165ZM116.5,57.5a9.67,9.67,0,0,0-14,0L74,86a19.92,19.92,0,0,0,0,28.5L102.5,143a9.9,9.9,0,0,0,14-14l-28-29L117,71.5C120.5,68,120.5,61.5,116.5,57.5Z" />
      </svg>
    </div>
  );
};

export default ICBack;
