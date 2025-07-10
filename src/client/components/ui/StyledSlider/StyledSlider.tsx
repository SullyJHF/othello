import React from 'react';
import './styled-slider.scss';

interface StyledSliderProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  label: string;
  description?: string;
  displayValue?: string;
  className?: string;
}

export const StyledSlider: React.FC<StyledSliderProps> = ({
  id,
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  label,
  description,
  displayValue,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className={`styled-slider-container ${className} ${disabled ? 'disabled' : ''}`}>
      <label className="styled-slider-label">
        {label}
        <input
          id={id}
          name={name}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="styled-slider-input"
        />
        {displayValue && <span className="styled-slider-value">{displayValue}</span>}
      </label>
      {description && <p className="styled-slider-description">{description}</p>}
    </div>
  );
};
