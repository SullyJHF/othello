import React from 'react';
import './copy-text-button.scss';

export const CopyTextButton = ({ text }) => {
  return (
    <div className="copy-text-wrapper">
      <div className="text">{text}</div>
      <button
        onClick={(e) => {
          navigator.clipboard.writeText(text);
        }}
        className="copy-btn"
      >
        Copy
      </button>
    </div>
  );
};
