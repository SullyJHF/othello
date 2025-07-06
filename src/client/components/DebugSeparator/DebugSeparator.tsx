/**
 * Reusable debug separator component with decorative line and label
 */

import React from 'react';
import './debug-separator.scss';

interface DebugSeparatorProps {
  className?: string;
}

export const DebugSeparator = ({ className = '' }: DebugSeparatorProps) => {
  return (
    <div className={`debug-separator ${className}`}>
      <span className="debug-label">Debug Mode</span>
    </div>
  );
};
