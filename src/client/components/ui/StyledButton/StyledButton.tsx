import { type ReactNode } from 'react';
import './styled-button.scss';

interface StyledButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
  size = 'medium',
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`styled-button ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  );
};
