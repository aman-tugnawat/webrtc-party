import React, { useEffect } from 'react';
import './App.css';
import HomePage from './components/HomePage';
import WaitingRoom from './components/WaitingRoom';
import TicTacToeGame from './components/TicTacToeGame';
import { useWebRTC } from './hooks/useWebRTC'; // Import the hook

// Placeholder for other game components if needed
const GenericGameComponent: React.FC<{ sessionId: string; playerId: string; gameType: string | null }> = ({ sessionId, playerId, gameType }) => {
    return (
        <div>
        <h2>Game Active!</h2>
        <p>Session ID: {sessionId}</p>
        <p>Your Player ID: {playerId}</p>
        <p>Game Type: {gameType || 'N/A'}</p>
        <p>Game component for '{gameType}' not implemented yet.</p>
        </div>
    );
};


function App() {
  const {
    sessionId,
    playerId,
    isHost,
    players,
    gameType,
    isGameStarted,
    isConnected,
    connectWebSocket,
    createSession,
    joinSession, // Destructure joinSession
    startGame,
    broadcastData, // Get broadcastData from hook
    registerDataCallback, // Get registerDataCallback from hook
  } = useWebRTC();

   // Attempt to connect WebSocket on initial load
   useEffect(() => {
    if (!isConnected) {
        connectWebSocket();
    }
    // Optional: Add cleanup for disconnect on unmount if desired application-wide
    // return () => {
    //   disconnectWebSocket();
    // };
   }, [connectWebSocket, isConnected]); // Dependencies ensure it runs once on mount

   // Effect to handle joining via URL
   useEffect(() => {
       const params = new URLSearchParams(window.location.search);
       const sessionIdFromUrl = params.get('session');

       if (sessionIdFromUrl && isConnected && !sessionId) {
           console.log(`Attempting to join session ${sessionIdFromUrl} from URL...`);
           joinSession(sessionIdFromUrl);
       }
       // Run only once on mount, but depend on isConnected and sessionId to re-evaluate if connection drops/reconnects or if session state changes unexpectedly
   }, [isConnected, sessionId, joinSession]);


  const renderContent = () => {
     if (!isConnected && !sessionId) {
        // Show HomePage even if not connected yet, allowing connection attempt
         console.log("Rendering HomePage (Not Connected)");
         return <HomePage connectWebSocket={connectWebSocket} createSession={createSession} isConnecting={!isConnected} />;
     } else if (isConnected && !sessionId) {
        // Connected but no session yet
        console.log("Rendering HomePage (Connected, No Session)");
        return <HomePage connectWebSocket={connectWebSocket} createSession={createSession} isConnecting={false} />;
     } else if (sessionId && !isGameStarted) {
        // In a session, waiting to start
         console.log("Rendering WaitingRoom");
         return <WaitingRoom
                     sessionId={sessionId}
                     players={players.map(p => `${p.playerId}${p.playerId === playerId ? ' (You)' : ''}${p.playerId === players[0]?.playerId ? ' (Host)' : ''}`)} // Basic player formatting
                     isHost={isHost}
                     startGame={startGame}
                 />;
      } else if (sessionId && isGameStarted && playerId) { // Ensure playerId is available
          // Game is active - Render specific game component based on gameType
          console.log(`Rendering Game Component for: ${gameType}`);
          if (gameType === 'Tic Tac Toe') {
              return <TicTacToeGame
                         broadcastData={broadcastData}
                         registerDataCallback={registerDataCallback}
                         isHost={isHost}
                     />;
          } else {
              // Render a placeholder or different game component for other types
              return <GenericGameComponent sessionId={sessionId} playerId={playerId} gameType={gameType} />;
          }
     } else {
         // Fallback / Initial state before connection attempt
         console.log("Rendering Fallback/Loading");
         return <div>Loading...</div>;
     }
  };

  return (
    <div className="App">
       <h1>WebRTC Game Lobby</h1>
       <p>WS Connected: {isConnected ? 'Yes' : 'No'} | Player ID: {playerId || 'N/A'} | Session ID: {sessionId || 'N/A'} | Host: {isHost ? 'Yes' : 'No'}</p>
       <hr />
       {renderContent()}
    </div>
  );
}

export default App;
