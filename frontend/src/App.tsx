import React, { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'; // Import routing components
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
  const navigate = useNavigate(); // Hook for navigation

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

   // Effect to handle joining via URL - Needs adjustment for routing
   useEffect(() => {
       const params = new URLSearchParams(window.location.search);
       const sessionIdFromUrl = params.get('session'); // Keep this for potential direct join links?

       // If there's a session ID in the URL, maybe navigate?
       // Or let the specific route component handle joining?
       // This needs rethinking. For now, let's disable the automatic join from URL search params
       // as routing will handle session context.
       /*
       if (sessionIdFromUrl && isConnected && !sessionId) {
           console.log(`Attempting to join session ${sessionIdFromUrl} from URL...`);
           // Instead of calling joinSession directly, maybe navigate?
           // navigate(`/session/${sessionIdFromUrl}`);
           // joinSession(sessionIdFromUrl); // The component at the route should handle this
       }
       */
       // Run only once on mount, but depend on isConnected and sessionId to re-evaluate if connection drops/reconnects or if session state changes unexpectedly
   }, [isConnected, sessionId, joinSession, navigate]);

   // Effect to navigate based on state changes
   useEffect(() => {
       // Only navigate if we are connected and have the necessary IDs
       if (!isConnected || !playerId) return;

       const currentPath = window.location.pathname;
       const targetSessionPath = `/session/${sessionId}`;
       const targetGamePath = `/game/${sessionId}`;

       if (sessionId && !isGameStarted && currentPath !== targetSessionPath) {
           console.log("Navigating to Waiting Room:", targetSessionPath);
           navigate(targetSessionPath);
       } else if (sessionId && isGameStarted && currentPath !== targetGamePath) {
           console.log("Navigating to Game:", targetGamePath);
           navigate(targetGamePath);
       } else if (!sessionId && (currentPath.startsWith('/session/') || currentPath.startsWith('/game/'))) {
           console.log("No session, navigating home");
           navigate('/'); // Navigate back home if session is lost
       }
       // Dependencies need careful consideration to avoid navigation loops
   }, [sessionId, isGameStarted, navigate, isConnected, playerId]);


  // Wrapper component to extract sessionId from URL and manage joining/state consistency
  const SessionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const { sessionId: sessionIdFromUrl } = useParams<{ sessionId: string }>();

      useEffect(() => {
          // If the URL has a session ID, we're connected, but our context doesn't match, try joining.
          if (sessionIdFromUrl && isConnected && sessionId !== sessionIdFromUrl) {
              console.log(`SessionWrapper: Attempting to join session ${sessionIdFromUrl} from route...`);
              joinSession(sessionIdFromUrl);
          }
      }, [sessionIdFromUrl, isConnected, sessionId, joinSession]);

      // Render children only if the URL session ID matches the context session ID
      // This prevents rendering components with inconsistent state while joining/loading.
      if (!sessionIdFromUrl || !sessionId || sessionId !== sessionIdFromUrl || !playerId) {
          // Show loading state if URL param is missing, context is missing, they don't match, or player ID isn't set yet
          return <div>Loading session data...</div>;
      }

      // If IDs match and playerID exists, render the actual component (WaitingRoom or Game)
      return <>{children}</>;
  };


  return (
    <div className="App">
       <h1>WebRTC Game Party</h1> {/* Updated Title */}
       {/* Keep some status info for debugging - can be removed later */}
       <p style={{ fontSize: '0.8em', color: '#aaa' }}>
           Status: {isConnected ? 'Connected' : 'Disconnected'} | Player: {playerId || 'N/A'} | Session: {sessionId || 'N/A'} | Host: {isHost ? 'Yes' : 'No'} | Game: {isGameStarted ? 'Started' : 'Waiting'}
       </p>
       <hr />
       <Routes>
            <Route path="/" element={
                // Render HomePage only if not in a session
                !sessionId ? (
                    <HomePage
                        connectWebSocket={connectWebSocket}
                        createSession={createSession}
                        isConnecting={!isConnected}
                        // Pass joinSession and navigate for the join form
                        joinSession={joinSession}
                        navigate={navigate}
                    />
                ) : (
                    // If already in a session, show loading or rely on useEffect to navigate
                    <div>Loading...</div>
                )
            } />
            <Route path="/session/:sessionId" element={
                <SessionWrapper>
                    {/* Render WaitingRoom only if game hasn't started */}
                    {!isGameStarted ? (
                        <WaitingRoom
                            sessionId={sessionId!} // Assert non-null as SessionWrapper checks this
                            players={players.map(p => `${p.playerId}${p.playerId === playerId ? ' (You)' : ''}${p.playerId === players[0]?.playerId ? ' (Host)' : ''}`)}
                            isHost={isHost}
                            startGame={startGame}
                        />
                    ) : (
                        // If game started while on this URL, SessionWrapper might show loading,
                        // or the useEffect hook should navigate away to /game/:sessionId
                        <div>Game has started, redirecting...</div>
                    )}
                </SessionWrapper>
            } />
             <Route path="/game/:sessionId" element={
                 <SessionWrapper>
                     {/* Render Game component only if game has started */}
                     {isGameStarted ? (
                         gameType === 'Tic Tac Toe' ? (
                             <TicTacToeGame
                                 broadcastData={broadcastData}
                                 registerDataCallback={registerDataCallback}
                                 isHost={isHost}
                             />
                         ) : (
                             <GenericGameComponent sessionId={sessionId!} playerId={playerId!} gameType={gameType} />
                         )
                     ) : (
                         // If game hasn't started but user is on this URL
                         <div>Waiting for game to start...</div>
                     )}
                 </SessionWrapper>
             } />
             {/* Add a catch-all or 404 route */}
             <Route path="*" element={
                 <div>
                     <h2>Page Not Found</h2>
                     <button onClick={() => navigate('/')}>Go Home</button>
                 </div>
             } />
       </Routes>
    </div>
  );
}

export default App;
