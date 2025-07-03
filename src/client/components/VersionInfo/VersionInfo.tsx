import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import './version-info.scss';

interface VersionInfoProps {
  className?: string;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ className = '' }) => {
  const [showDetails, setShowDetails] = useState(false);

  const version = process.env.REACT_APP_VERSION ?? 'development';
  const buildHash = process.env.REACT_APP_BUILD_HASH ?? 'local';
  const buildBranch = process.env.REACT_APP_BUILD_BRANCH ?? 'local';
  const buildTime = process.env.REACT_APP_BUILD_TIME ?? new Date().toISOString();

  const shortHash = buildHash.length > 7 ? buildHash.substring(0, 7) : buildHash;
  const formattedTime = buildTime ? new Date(buildTime).toLocaleString() : 'Unknown';

  return (
    <div className={`version-info ${className}`}>
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
