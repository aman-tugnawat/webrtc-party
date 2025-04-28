import React, { useState } from 'react';
import { NavigateFunction } from 'react-router-dom'; // Import NavigateFunction

interface HomePageProps {
  connectWebSocket: () => void; // Function to initiate WebSocket connection
  createSession: (gameType: string) => void; // Function to send create_session message
  isConnecting: boolean; // Flag to indicate if WebSocket is attempting to connect
  joinSession: (sessionId: string) => void; // Function to join an existing session
  navigate: NavigateFunction; // Function to navigate programmatically
}


const HomePage: React.FC<HomePageProps> = ({ connectWebSocket, createSession, isConnecting, joinSession, navigate }) => {
  const gameTypes = ['Tic Tac Toe', 'Ping Pong']; // Available game types
  const [selectedGameType, setSelectedGameType] = useState<string>(gameTypes[0]);
  const [joinSessionId, setJoinSessionId] = useState<string>(''); // State for the session ID input

   // Removed the useEffect for connectWebSocket as App.tsx handles it now

  const handleGameTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGameType(event.target.value);
  };

  const handleCreateGameClick = () => {
    console.log(`Requesting to create session for ${selectedGameType}...`);
    createSession(selectedGameType);
    // Navigation will be handled by the useEffect in App.tsx when sessionId changes
  };

  const handleJoinSessionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setJoinSessionId(event.target.value.trim()); // Trim whitespace
  };

  const handleJoinGameClick = (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission if wrapped in a form
    if (joinSessionId) {
      console.log(`Attempting to join session ${joinSessionId}...`);
      joinSession(joinSessionId);
      // Navigation will be handled by the useEffect in App.tsx when sessionId changes
    } else {
      alert('Please enter a Session ID to join.');
    }
  };


  return (
    // Using class names for potential future styling
    <div className="home-page">
      <h2>Create or Join a Game</h2>
      <div className="session-options">
          {/* Create Session Section */}
          <div className="create-session-card card">
            <h3>Create New Game</h3>
            <div className="form-group">
                <label htmlFor="gameTypeSelect">Select Game:</label>
                <select
                  id="gameTypeSelect"
                  value={selectedGameType}
                  onChange={handleGameTypeChange}
                >
                  {gameTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
            </div>
            <button className="btn btn-primary" onClick={handleCreateGameClick} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Create Game Session'}
            </button>
          </div>

          {/* Join Session Section */}
          <div className="join-session-card card">
            <h3>Join Existing Game</h3>
            <form onSubmit={handleJoinGameClick}>
                <div className="form-group">
                    <label htmlFor="joinSessionIdInput">Session ID:</label>
                    <input
                      id="joinSessionIdInput"
                      type="text"
                      value={joinSessionId}
                      onChange={handleJoinSessionIdChange}
                      placeholder="Enter Session ID"
                      required // Make input required
                    />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={isConnecting || !joinSessionId}>
                  {isConnecting ? 'Connecting...' : 'Join Game'}
                </button>
            </form>
          </div>
      </div>
      {isConnecting && <p className="connection-status">Attempting to connect to server...</p>}
</div>
  );
};

export default HomePage;
