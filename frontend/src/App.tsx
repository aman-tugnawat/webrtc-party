import React, { useState, useEffect, useCallback } from 'react'; // Import useState, useCallback
import './App.css';
import HomePage from './components/HomePage';
import WaitingRoom from './components/WaitingRoom';
import TicTacToeGame from './components/TicTacToeGame';
import PingPongGame from './components/PingPongGame'; // Import PingPongGame
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
    startGame,
    broadcastData, // Get broadcastData from hook
    registerDataCallback, // Get registerDataCallback from hook
    joinSession, // Destructure joinSession
  } = useWebRTC();

  // State for detailed connection status
  type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false); // State for session creation loading

   // Attempt to connect WebSocket on initial load and set 'connecting' status
   useEffect(() => {
    if (!isConnected && connectionStatus !== 'connecting') { // Avoid repeated calls if already connecting
        console.log('[App.tsx] Attempting WebSocket connection...');
        setConnectionStatus('connecting');
        connectWebSocket();
    }
    // Optional: Cleanup not implemented here, might be handled in useWebRTC
    // return () => {
    //   disconnectWebSocket();
    // };
   }, [connectWebSocket, isConnected, connectionStatus]); // Added connectionStatus dependency

   // Effect to update status based on isConnected from the hook
   useEffect(() => {
     if (isConnected) {
       setConnectionStatus('connected');
       console.log('[App.tsx] WebSocket connected.');
     } else {
       // If was previously 'connected' or 'connecting', now it's 'disconnected'.
       // We don't have explicit error state from the hook, so 'disconnected' covers general closure/failure.
       // The 'error' state might be set if an error callback mechanism existed.
       if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
         setConnectionStatus('disconnected');
         console.log('[App.tsx] WebSocket disconnected.');
       }
       // If initial state is 'disconnected', it remains so until connection attempt.
     } else {
       // If was previously 'connected' or 'connecting', now it's 'disconnected'.
       // We don't have explicit error state from the hook, so 'disconnected' covers general closure/failure.
       // The 'error' state might be set if an error callback mechanism existed.
       if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
         setConnectionStatus('disconnected');
         console.log('[App.tsx] WebSocket disconnected.');
         // If connection drops while trying to create, reset creation state
         if (isCreatingSession) {
           console.warn('[App.tsx] WebSocket disconnected while creating session.');
           setIsCreatingSession(false); // Reset loading state on disconnect
         }
       }
       // If initial state is 'disconnected', it remains so until connection attempt.
     }
   }, [isConnected, connectionStatus, isCreatingSession]); // Added isCreatingSession dependency

   // Effect to turn off loading state when session is created (sessionId is set)
   useEffect(() => {
     if (sessionId && isCreatingSession) {
       console.log('[App.tsx] Session created (sessionId received), setting isCreatingSession to false.');
       setIsCreatingSession(false);
     }
   }, [sessionId, isCreatingSession]);


   // Wrapper for createSession to handle loading state
   const handleCreateSession = useCallback((gameType: string) => {
     if (connectionStatus !== 'connected') { // Ensure connected before attempting
       console.error("[App.tsx] Cannot create session: WebSocket not connected.");
       // Optionally trigger a connection attempt or show error to user
       return;
     }
     console.log('[App.tsx] Initiating session creation process...');
     setIsCreatingSession(true); // Set loading state
     createSession(gameType); // Call the original function from the hook
   }, [createSession, connectionStatus]); // Dependencies for useCallback


  const renderContent = () => {
      // Show loading message if creating session
      if (isCreatingSession) {
         console.log("Rendering 'Creating session...' message.");
         return <div>Creating session...</div>; // Display loading message
      }

      // Use connectionStatus for rendering logic
      // const isEffectivelyConnected = connectionStatus === 'connected'; // No longer needed here
      const showHomePage = !sessionId; // Show home if no session ID regardless of connection status detail

      if (showHomePage) {
          console.log(`Rendering HomePage (Status: ${connectionStatus})`);
          // Pass accurate connecting status and creation state/handler
          return <HomePage
                     connectWebSocket={connectWebSocket}
                     createSession={handleCreateSession} // Pass the wrapper function
                     joinSession={joinSession} // Pass joinSession down
                     isConnecting={connectionStatus === 'connecting'}
                     isCreatingSession={isCreatingSession} // Pass the loading state
                 />;
      } else if (sessionId && !isGameStarted) {
         // In a session, waiting to start (implies connection was successful at some point)
          console.log("Rendering WaitingRoom (Status: connected - assumed)"); // Assuming connected if in session
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
       {/* Display detailed connection status */}
       <p>Status: {connectionStatus} | Player ID: {playerId || 'N/A'} | Session ID: {sessionId || 'N/A'} | Host: {isHost ? 'Yes' : 'No'}</p>
       <hr />
       {renderContent()}
    </div>
  );
}

export default App;
