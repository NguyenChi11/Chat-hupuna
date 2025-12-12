import React from "react";

interface IconProps {
  className?: string;
  stroke?: string;
  title?: string;
}

const ICVideoOff = ({ className, stroke, title }: IconProps) => {
  return (
    <div>
      <svg
        className={className}
        width="800px"
        height="800px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={title}
        role="img"
      >
        {title && <title>{title}</title>}
        <path
          d="M3 6V16C3 17.1046 3.89543 18 5 18H13C13.3151 18 13.6095 17.9252 13.8712 17.792M16 10L21 7V17L18.5 15.75"
          stroke={stroke || "#141415"}
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 3L21 21"
          stroke={stroke || "#141415"}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default ICVideoOff;
