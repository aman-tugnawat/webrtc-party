import React, { useState, useEffect } from 'react';

interface HomePageProps {
  connectWebSocket: () => void; // Function to initiate WebSocket connection
  createSession: (gameType: string) => void; // Function to send create_session message
  joinSession: (sessionId: string) => void; // Function to send join_session message
  isConnecting: boolean; // Flag to indicate if WebSocket is attempting to connect
  isCreatingSession: boolean; // Flag to indicate if session creation is in progress
}


const HomePage: React.FC<HomePageProps> = ({ connectWebSocket, createSession, joinSession, isConnecting, isCreatingSession }) => {
  const gameTypes = ['Tic Tac Toe', 'Ping Pong']; // Available game types
  const [selectedGameType, setSelectedGameType] = useState<string>(gameTypes[0]);
  const [joinCode, setJoinCode] = useState<string>(''); // State for join code input

   // Optional: If App.tsx doesn't handle initial connect, uncomment this
   /*
   useEffect(() => {
     // Attempt connection if not already trying (passed via isConnecting)
     if (!isConnecting) {
        connectWebSocket();
     }
   }, [connectWebSocket, isConnecting]);
   */

  const handleGameTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGameType(event.target.value);
  };

  const handleCreateGameClick = () => {
    console.log(`Requesting to create session for ${selectedGameType}...`);
    createSession(selectedGameType);
  };

  const handleJoinCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure uppercase and limit length visually, although maxLength handles final length
    setJoinCode(event.target.value.toUpperCase().slice(0, 4));
  };

  const handleJoinGameClick = () => {
    const trimmedCode = joinCode.trim();
    if (trimmedCode.length !== 4) {
      alert('Invalid session code. Please enter exactly 4 characters.'); // Simple feedback
      console.error('Join attempt failed: Invalid code length', trimmedCode);
      return;
    }
    console.log(`Attempting to join session with code: ${trimmedCode}...`);
    joinSession(trimmedCode); // Call the function passed from App.tsx
    setJoinCode(''); // Clear input after attempt
  };

  return (
    <div>
      <h2>Create or Join a Game</h2>
      {/* Add Join Session UI later */}
      <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3>Create New Game</h3>
        <label htmlFor="gameTypeSelect" style={{ marginRight: '0.5rem' }}>Select Game:</label>
        <select
          id="gameTypeSelect"
          style={{ marginRight: '0.5rem' }}
          value={selectedGameType}
          onChange={handleGameTypeChange}
        >
          {gameTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button onClick={handleCreateGameClick} disabled={isConnecting || isCreatingSession}>
          {isConnecting ? 'Connecting...' : isCreatingSession ? 'Creating...' : 'Create Game Session'}
        </button>
      </div>

       <hr style={{ margin: '1rem 0' }}/> {/* Separator */}

       {/* --- Join Existing Game Section --- */}
       <div>
           <h3>Join Existing Game</h3>
           <label htmlFor="joinCodeInput" style={{ marginRight: '0.5rem' }}>Enter Code:</label>
           <input
               id="joinCodeInput"
               type="text"
               placeholder="ABCD"
               value={joinCode}
               onChange={handleJoinCodeChange}
               maxLength={4}
               style={{ marginRight: '0.5rem', textTransform: 'uppercase', width: '100px' }}
               disabled={isConnecting || isCreatingSession} // Disable input when busy
           />
           <button
               onClick={handleJoinGameClick}
               disabled={isConnecting || isCreatingSession || joinCode.length !== 4} // Disable if busy or code length != 4
            >
               Join Game
           </button>
       </div>

     </div>
  );
};

export default HomePage;
