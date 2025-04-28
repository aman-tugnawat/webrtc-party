import React from 'react'; // Removed useState

// Define props interface for required props from App.tsx
interface WaitingRoomProps {
  sessionId: string;
  players: string[]; // Expecting already formatted strings
  isHost: boolean;
  startGame: () => void; // Function to call when host clicks start
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ sessionId, players, isHost, startGame }) => {
  // State is now managed by useWebRTC hook in App.tsx

  // Calculate shareable URL based on props - Use the actual route now
  const shareableUrl = `${window.location.origin}/session/${sessionId}`;

  const handleStartGameClick = () => {
    console.log(`Requesting to start game for session ${sessionId}...`);
    startGame(); // Call the startGame function passed via props
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableUrl)
      .then(() => alert('Share URL copied to clipboard!'))
      .catch(err => console.error('Failed to copy URL: ', err));
  };

  return (
    <div className="waiting-room card"> {/* Use card style */}
      <h2>Waiting Room</h2>
      <div className="session-info">
        <p><strong>Game Code:</strong> <code>{sessionId}</code></p> {/* Use sessionId prop */}
        <p>
            <strong>Share URL:</strong>
            <a href={shareableUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }}>{shareableUrl}</a>
            <button onClick={copyToClipboard} className="btn btn-small" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8em' }}>Copy</button>
        </p>
      </div>

      <div className="player-section">
        <h3>Players ({players.length}):</h3>
        {players.length > 0 ? (
          <ul className="player-list"> {/* Use player-list style */}
            {/* Use player string directly as key assuming it's unique enough for this context */}
            {players.map((player) => (
              <li key={player}>{player}</li>
            ))}
          </ul>
        ) : (
          <p>Waiting for players...</p>
        )}
      </div>

      {/* Use isHost prop to conditionally render button */}
      <div className="action-area">
          {isHost && (
            <button onClick={handleStartGameClick} className="btn btn-primary"> {/* Use btn styles */}
              Start Game
            </button>
          )}
          {!isHost && <p className="status-text">Waiting for the host to start the game...</p>}
      </div>
    </div>
  );
};

export default WaitingRoom;
