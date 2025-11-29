import React from 'react';

type ButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  disabled?: boolean;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
};

export const ButtonBase = ({
  children,
  className = 'text-white bg-green-500 hover:bg-green-700',
  style,
  onClick,
  type = 'button',
  title,
  disabled = false,
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      title={title}
      className={`${className} flex items-center cursor-pointer justify-center gap-2 py-[0.5rem] px-[1.25rem] text-md font-medium rounded-md`}
      style={{
        ...style,
        backgroundColor: disabled ? '#CECECE' : '',
        cursor: disabled ? 'not-allowed' : '',
      }}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};
