import React, { useState } from 'react';

interface HomePageProps {
  connectWebSocket: () => void; // Function to initiate WebSocket connection
  createSession: (gameType: string) => void; // Function to send create_session message
  isConnecting: boolean; // Flag to indicate if WebSocket is attempting to connect
}


const HomePage: React.FC<HomePageProps> = ({ createSession, isConnecting }) => {
  const gameTypes = ['Tic Tac Toe', 'Ping Pong']; // Available game types
  const [selectedGameType, setSelectedGameType] = useState<string>(gameTypes[0]);

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

  return (
    <div>
      <h2>Create or Join a Game</h2>
      {/* Add Join Session UI later */}
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
        <button onClick={handleCreateGameClick} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Create Game Session'}
        </button>
      </div>
      {/* TODO: Add UI for joining an existing session using an ID */}
       {/*
       <div>
           <h3>Join Existing Game</h3>
           <input type="text" placeholder="Enter Game Code (e.g., ABCD)" maxLength={4} />
           <button disabled={isConnecting}>Join Game</button>
       </div>
       */}
     </div>
  );
};

export default HomePage;
