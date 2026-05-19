import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  ...rest 
}) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`} 
      {...rest}
    >
      {children}
    </button>
  );
};