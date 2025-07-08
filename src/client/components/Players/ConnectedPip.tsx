import './pip.scss';

export const ConnectedPip = ({ connected, small }: { connected: boolean; small?: boolean }) => {
  return (
    <div className={`pip-wrapper ${small ? 'small' : ''}`}>
      <div className={`connected-pip ${connected ? 'connected' : 'disconnected'}`} />
    </div>
  );
};
