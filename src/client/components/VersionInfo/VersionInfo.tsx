import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect, useRef } from 'react';
import './version-info.scss';

interface VersionInfoProps {
  className?: string;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ className = '' }) => {
  const [showDetails, setShowDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const version = process.env.VITE_VERSION ?? 'development';
  const buildHash = process.env.VITE_BUILD_HASH ?? 'local';
  const buildBranch = process.env.VITE_BUILD_BRANCH ?? 'local';
  const buildTime = process.env.VITE_BUILD_TIME ?? new Date().toISOString();

  const shortHash = buildHash.length > 7 ? buildHash.substring(0, 7) : buildHash;
  const formattedTime = buildTime ? new Date(buildTime).toLocaleString() : 'Unknown';

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDetails]);

  return (
    <div className={`version-info ${className}`} ref={containerRef}>
      <button
        className="version-info__toggle"
        onClick={() => setShowDetails(!showDetails)}
        title="Show build information"
        aria-label="Show build information"
      >
        <FontAwesomeIcon icon={faQuestionCircle} />
      </button>

      {showDetails && (
        <div className="version-info__details">
          <div className="version-info__header">Build Information</div>
          <div className="version-info__detail">
            <span className="version-info__label">Version:</span>
            <span className="version-info__value">{version}</span>
          </div>
          <div className="version-info__detail">
            <span className="version-info__label">Commit:</span>
            <span className="version-info__value">{shortHash}</span>
          </div>
          <div className="version-info__detail">
            <span className="version-info__label">Branch:</span>
            <span className="version-info__value">{buildBranch}</span>
          </div>
          <div className="version-info__detail">
            <span className="version-info__label">Built:</span>
            <span className="version-info__value">{formattedTime}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionInfo;
