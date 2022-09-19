import React, { useState } from 'react';
import './copy-text-button.scss';

export const CopyTextButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const onCopyClicked = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3333);
  };
  return (
    <div className="copy-text-wrapper">
      <div className="text">{text}</div>
      <button onClick={onCopyClicked} className="copy-btn">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};
