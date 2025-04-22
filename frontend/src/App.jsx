import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css'; // Keep existing App CSS
import HomePage from './components/HomePage';
import WaitingRoom from './components/WaitingRoom';
import GameScreen from './components/GameScreen';

// Define view states
const VIEWS = {
  HOME: 'home',
  WAITING: 'waiting',
  GAME: 'game',
};

const WEBSOCKET_URL = 'ws://localhost:8080/ws'; // Move URL to constant

function App() {
  const [view, setView] = useState(VIEWS.HOME);
  const [sessionCode, setSessionCode] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const ws = useRef(null); // Use useRef to hold the WebSocket instance
  const peerConnection = useRef(null); // Ref to store the RTCPeerConnection
  const dataChannel = useRef(null); // Ref to store the RTCDataChannel
  const [peerConnectionStatus, setPeerConnectionStatus] = useState('disconnected');

  // --- Game State ---
  const [gameType, setGameType] = useState(null); // e.g., 'TicTacToe'
  const [boardState, setBoardState] = useState(Array(9).fill(null));
  const [myMark, setMyMark] = useState(null); // 'X' or 'O'
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState(null); // null, 'X', 'O', or 'Draw'
  // --- Ping Pong State ---
  const [paddleY, setPaddleY] = useState({ player1: 200, player2: 200 }); // Initial Y position (center)
  const [ball, setBall] = useState({ x: 300, y: 200, vx: 3, vy: 2 }); // Initial position and velocity
  const [score, setScore] = useState({ player1: 0, player2: 0 });

  // WebRTC Configuration (STUN server)
  const peerConnectionConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  // Function to send messages (safer with connection check)
  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      console.log('Sent:', message);
    } else {
      console.error('WebSocket not connected or not open. Cannot send message:', message);
      setWsError('Not connected to server.'); // Inform user
      // Optionally try to reconnect or handle error
    }
  }, []); // Dependency array is empty as ws.current doesn't trigger re-renders

  // Function to setup PeerConnection
  const setupPeerConnection = useCallback(() => {
      console.log('Setting up PeerConnection...');
      setPeerConnectionStatus('connecting');
      const pc = new RTCPeerConnection(peerConnectionConfig);
      peerConnection.current = pc; // Store the connection

      pc.onicecandidate = (event) => {
          if (event.candidate) {
              console.log('Sending ICE candidate:', event.candidate);
              sendMessage({
                  type: 'SIGNAL',
                  payload: { type: 'candidate', candidate: event.candidate },
              });
          }
      };

      pc.oniceconnectionstatechange = () => {
          console.log('PeerConnection state:', pc.iceConnectionState);
          setPeerConnectionStatus(pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
              // Handle cleanup or reconnection attempts if needed
              console.error('PeerConnection failed or disconnected.');
              // Optionally close and reset
              // closePeerConnection();
          }
      };

       // Handle incoming data channel (for receiver)
       pc.ondatachannel = (event) => {
           console.log('Data channel received:', event.channel.label);
           dataChannel.current = event.channel;
           setupDataChannelEvents(event.channel);
       };

       // Return the created PeerConnection instance
       return pc;

  }, [sendMessage, peerConnectionConfig]); // Include dependencies

    // Function to setup data channel events
    const setupDataChannelEvents = (dc) => {
        dc.onopen = () => {
            console.log('Data channel OPEN');
            // Send a test message
            // dc.send("Hello from data channel!");
        };
        dc.onclose = () => {
            console.log('Data channel CLOSED');
        };
        dc.onerror = (error) => {
            console.error('Data channel error:', error);
        };
        dc.onmessage = (event) => {
            console.log('Data channel message:', event.data);
            // Handle incoming game data
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'MOVE' && data.index !== undefined) {
                    console.log(`Received move: ${data.index} by opponent`);
                    setBoardState(prevBoard => {
                        const newBoard = [...prevBoard];
                        // Determine opponent's mark
                        const opponentMark = myMark === 'X' ? 'O' : 'X';
                        if (newBoard[data.index] === null) { // Ensure cell is empty
                           newBoard[data.index] = opponentMark;
                           const gameWinner = checkWinner(newBoard); // Check winner after opponent's move
                           if (gameWinner) {
                               console.log(`Winner determined after opponent's move: ${gameWinner}`);
                               setWinner(gameWinner);
                               setIsMyTurn(false); // Game over
                           } else {
                               setIsMyTurn(true); // It's now my turn
                           }
                           return newBoard;
                        } else {
                            console.warn("Received move for already occupied cell:", data.index);
                            return prevBoard; // Don't update if cell taken
                        }
                    });
                } else {
                   console.warn("Received unknown data channel message format:", data);
                }
            } catch (error) {
                console.error("Error processing data channel message:", error);
            }
        };
    };

     // Function to close PeerConnection and DataChannel
     const closePeerConnection = () => {
        if (dataChannel.current) {
            dataChannel.current.close();
            dataChannel.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setPeerConnectionStatus('disconnected');
        console.log('PeerConnection closed.');
    };


  // WebSocket connection effect
  useEffect(() => {
    console.log('Attempting to connect WebSocket...');
    ws.current = new WebSocket(WEBSOCKET_URL);
    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      setWsError(null); // Clear previous errors on successful connection
    };
    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
      setWsError('Disconnected from server.');
      // Reset state on disconnect
      setView(VIEWS.HOME);
      setSessionCode('');
      setPlayerCount(0);
      setIsHost(false);
      ws.current = null; // Clear the ref
            closePeerConnection(); // Clean up WebRTC connection
      // Optionally implement automatic reconnection logic here
    };
    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setWsError('Connection error. Ensure the backend server is running.');
      setIsConnected(false); // Ensure connection status is false on error
    };
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received:', message);

        switch (message.type) {
          case 'SESSION_CREATED':
            setSessionCode(message.payload.sessionCode);
            setIsHost(true); // The creator is the host
            setView(VIEWS.WAITING);
            setPlayerCount(1); // Start with 1 player (host)
            break;
          case 'JOIN_SUCCESS':
            setSessionCode(message.payload.sessionCode);
            setIsHost(false); // Joining player is not the host
            setView(VIEWS.WAITING);
            // Player count will be updated by PLAYER_UPDATE
            break;
          case 'PLAYER_UPDATE':
            setPlayerCount(message.payload.playerCount);
            // Could add player list update here later
            break;
          case 'GAME_STARTED':
            setView(VIEWS.GAME);

            // TODO: Replace hardcoding with game type selection later
            const selectedGameType = 'PingPong'; // Hardcode for now
            setGameType(selectedGameType);

            if (selectedGameType === 'TicTacToe') {
                // --- Initialize Tic Tac Toe Game ---
                setBoardState(Array(9).fill(null)); // Reset board
                setWinner(null); // Reset winner
                if (isHost) {
                     setMyMark('X');
                     setIsMyTurn(true); // Host goes first
                     console.log("Host is X, starting turn. Starting WebRTC setup...");
                } else {
                     setMyMark('O');
                     setIsMyTurn(false); // Client waits for host's move
                     console.log("Client is O, waiting for turn. Waiting for WebRTC offer...");
                }
            } else if (selectedGameType === 'PingPong') {
                 // --- Initialize Ping Pong Game ---
                 setPaddleY({ player1: 200, player2: 200 }); // Center paddles
                 setBall({ x: 300, y: 200, vx: 3, vy: 2 }); // Reset ball state
                 setScore({ player1: 0, player2: 0 });
                 console.log("Ping Pong game initialized. Starting WebRTC setup...");
                 // Note: Turn logic for Ping Pong might differ or not be needed
                 // setIsMyTurn(true); // We don't use Tic Tac Toe turn logic for Ping Pong
            }

            // --- Start WebRTC (Common for both games) ---
            if (isHost) {
                 console.log("Host starting WebRTC connection setup...");
                 // --- Start WebRTC as Host ---
                const pc = setupPeerConnection(); // Setup PC as initiator
                // Create data channel
                const dc = pc.createDataChannel('gameData');
                dataChannel.current = dc; // Store ref
                setupDataChannelEvents(dc); // Setup handlers for the created channel
                // Create offer
                pc.createOffer()
                  .then(offer => pc.setLocalDescription(offer))
                  .then(() => {
                      console.log('Sending offer:', pc.localDescription);
                      sendMessage({
                          type: 'SIGNAL',
                          payload: { type: 'offer', sdp: pc.localDescription.sdp },
                      });
                  })
                  .catch(e => console.error('Error creating/sending offer:', e));
            } else {
                 setMyMark('O');
                 setIsMyTurn(false); // Client waits for host's move
                 console.log("Client is O, waiting for turn. Waiting for WebRTC offer...");
                 // Client side will setup PeerConnection upon receiving offer
            }
            break;
          case 'SIGNAL': // Handle signaling messages for WebRTC/P2P
            handleSignal(message.payload); // Delegate to separate handler
            break;
          case 'ERROR':
            console.error('Backend Error:', message.payload.message);
            alert(`Error: ${message.payload.message}`); // Show error to user
            // Optionally reset state or handle specific errors
            if (message.payload.message === 'Session not found') {
               setView(VIEWS.HOME);
               setSessionCode('');
            }
            break;
          default:
            console.warn('Received unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse message or handle incoming data:', event.data, error);
      }
    };

    // Cleanup function to close WebSocket on component unmount
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection');
        ws.current.close();
      }
      ws.current = null;
      closePeerConnection(); // Clean up WebRTC connection on unmount
    };
  }, [isHost, setupPeerConnection, sendMessage]); // Add dependencies


  // --- Game Action Handlers ---
   const handleMove = useCallback((index) => {
    console.log(`handleMove called for index: ${index}, myMark: ${myMark}, isMyTurn: ${isMyTurn}`);
    // Check if it's my turn, the cell is empty, and there's no winner yet
    if (isMyTurn && boardState[index] === null && !winner) {
        const newBoard = [...boardState];
        newBoard[index] = myMark;
        setBoardState(newBoard);
        setIsMyTurn(false); // End my turn

        // Send move over data channel
        if (dataChannel.current && dataChannel.current.readyState === 'open') {
            const moveData = JSON.stringify({ type: 'MOVE', index: index });
            console.log("Sending move:", moveData);
            dataChannel.current.send(moveData);
        } else {
            console.error("Data channel not open, cannot send move.");
            // Handle error - perhaps revert state or notify user?
        }

        // Check for winner after my move
        const gameWinner = checkWinner(newBoard);
        if (gameWinner) {
            console.log(`Winner determined after my move: ${gameWinner}`);
            setWinner(gameWinner);
            // No need to change turn if game is over
        }

    } else {
       console.warn(`Move blocked: isMyTurn=${isMyTurn}, boardState[${index}]=${boardState[index]}, winner=${winner}`);
    }
  }, [isMyTurn, boardState, myMark, winner, checkWinner]); // Dependencies for handleMove


  // --- Tic Tac Toe Logic ---
  const checkWinner = useCallback((board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Return 'X' or 'O'
      }
    }
    // Check for draw (all cells filled, no winner)
    if (board.every(cell => cell !== null)) {
      return 'Draw';
    }
    return null; // No winner yet
  }, []);

  // Separate handler for incoming SIGNAL messages
  const handleSignal = useCallback(async (signal) => {
      console.log('Received SIGNAL:', signal);
      let pc = peerConnection.current;

      try {
          if (signal.type === 'offer') {
              if (pc) {
                  console.warn('Existing PeerConnection found when receiving offer. Closing old one.');
                  closePeerConnection();
              }
              console.log('Received offer, setting up PeerConnection...');
              pc = setupPeerConnection(); // Setup PC as receiver
              console.log('Setting remote description (offer)...');
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
              console.log('Creating answer...');
              const answer = await pc.createAnswer();
              console.log('Setting local description (answer)...');
              await pc.setLocalDescription(answer);
              console.log('Sending answer:', answer);
              sendMessage({ type: 'SIGNAL', payload: { type: 'answer', sdp: answer.sdp } });
          } else if (signal.type === 'answer') {
              if (!pc) {
                  console.error('Received answer but PeerConnection does not exist.');
                  return;
              }
              console.log('Received answer, setting remote description...');
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          } else if (signal.type === 'candidate') {
              if (!pc) {
                  console.error('Received candidate but PeerConnection does not exist.');
                  return;
              }
               if (signal.candidate) {
                   console.log('Adding received ICE candidate...');
                   await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
               }
          } else {
              console.warn('Unknown signal type:', signal.type);
          }
      } catch (error) {
          console.error('Error handling signal:', signal.type, error);
          // Optionally close connection on error
          // closePeerConnection();
      }
  }, [setupPeerConnection, sendMessage]); // Include dependencies

  // Handler functions to send messages
  const handleCreateSession = useCallback(() => {
    sendMessage({ type: 'CREATE_SESSION' });
  }, [sendMessage]);

  const handleJoinSession = useCallback((code) => {
    sendMessage({ type: 'JOIN_SESSION', payload: { sessionCode: code } });
  }, [sendMessage]);

  const handleStartGame = useCallback(() => {
    if (isHost) {
      sendMessage({ type: 'START_GAME', payload: {} }); // Payload can be added later
    } else {
      console.warn('Attempted to start game as non-host.');
    }
  }, [isHost, sendMessage]);

  // Render logic based on view state
  const renderView = () => {
    switch (view) {
      case VIEWS.WAITING:
        return (
          <WaitingRoom
            sessionCode={sessionCode}
            playerCount={playerCount}
            isHost={isHost}
            onStartGame={handleStartGame}
          />
        );
      case VIEWS.GAME:
        return (
          <GameScreen
            sessionCode={sessionCode}
            isHost={isHost}
            peerConnectionStatus={peerConnectionStatus}
            // Pass data channel ref or send function down if needed
            // Pass game state and handlers
            gameType={gameType}
            boardState={boardState}
            myMark={myMark} // Pass myMark
            isMyTurn={isMyTurn}
            winner={winner}
            handleMove={handleMove}
            // dataChannel={dataChannel.current} // Might not be needed directly
          />
        );
      case VIEWS.HOME:
      default:
        return (
          <HomePage
            onCreateSession={handleCreateSession}
            onJoinSession={handleJoinSession}
          />
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* Basic connection status indicator */}
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
        {wsError && <p style={{ color: 'red' }}>Error: {wsError}</p>}
      </header>
      <main>
        {renderView()}
      </main>
    </div>
  );
}

export default App;
