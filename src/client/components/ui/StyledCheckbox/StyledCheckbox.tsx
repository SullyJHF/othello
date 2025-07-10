import { type ChangeEvent } from 'react';
import './styled-checkbox.scss';

interface StyledCheckboxProps {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  className?: string;
}

export const StyledCheckbox: React.FC<StyledCheckboxProps> = ({
  id,
  name,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={`styled-checkbox-container ${className} ${disabled ? 'disabled' : ''}`}>
      <label className="styled-checkbox-option">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="styled-checkbox-input"
        />
        <span className="styled-checkbox-label">{label}</span>
      </label>
      {description && <p className="styled-checkbox-description">{description}</p>}
    </div>
  );
};
