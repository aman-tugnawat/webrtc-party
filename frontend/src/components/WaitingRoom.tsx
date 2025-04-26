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

  // Calculate shareable URL based on props
  const shareableUrl = `${window.location.origin}/?session=${sessionId}`; // Use query parameter

  const handleStartGameClick = () => {
    console.log(`Requesting to start game for session ${sessionId}...`);
    startGame(); // Call the startGame function passed via props
  };

  return (
    <div>
      <h2>Waiting Room - {sessionId}</h2>
      <div>
        <strong>Game Code:</strong> {sessionId} {/* Use sessionId prop */}
      </div>
      <div>
        <strong>Share URL:</strong> <a href={shareableUrl} target="_blank" rel="noopener noreferrer">{shareableUrl}</a>
        {/* TODO: Basic copy-to-clipboard could be added here */}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Players ({players.length}):</h3>
        {players.length > 0 ? (
          <ul>
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
      {isHost && (
        <button onClick={handleStartGameClick} style={{ marginTop: '1rem' }}>
          Start Game
        </button>
      )}
      {!isHost && <p>Waiting for the host to start the game...</p>}
    </div>
  );
};

export default WaitingRoom;
