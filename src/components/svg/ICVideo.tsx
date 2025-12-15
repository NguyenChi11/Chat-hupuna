import React from "react";

interface IconProps {
  className?: string;
  stroke?: string;
  title?: string;
}

const ICVideo = ({ className, stroke, title }: IconProps) => {
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
          d="M16 9L21 7V17L16 15M4 18.5H15C15.5523 18.5 16 18.0523 16 17.5V6.5C16 5.94772 15.5523 5.5 15 5.5H4C3.44772 5.5 3 5.94772 3 6.5V17.5C3 18.0523 3.44772 18.5 4 18.5Z"
          stroke={stroke || "#141415"}
          strokeWidth="0.768"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default ICVideo;
