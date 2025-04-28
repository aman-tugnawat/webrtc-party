import React, { useState, useEffect, useCallback } from 'react';
import Cell from './Cell'; // Import the Cell component

type PlayerMark = 'X' | 'O';
type Winner = PlayerMark | 'Draw' | null;

interface TicTacToeGameProps {
  broadcastData: (data: any) => void;
  registerDataCallback: (callback: (data: any, senderId: string) => void) => void;
  isHost: boolean; // Host is always 'X'
}

const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ broadcastData, registerDataCallback, isHost }) => {
  const initialBoard = Array(9).fill(null);
  const [board, setBoard] = useState<(PlayerMark | null)[]>(initialBoard);
  const [playerMark] = useState<PlayerMark>(isHost ? 'X' : 'O'); // Host is X, Guest is O
  const [isMyTurn, setIsMyTurn] = useState<boolean>(isHost); // Host starts
  const [winner, setWinner] = useState<Winner>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // --- Game Logic Helpers ---

  const checkWinner = useCallback((currentBoard: (PlayerMark | null)[]): Winner => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6], // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return currentBoard[a]; // 'X' or 'O'
      }
    }
    // Check for draw (no null cells left)
    if (currentBoard.every(cell => cell !== null)) {
      return 'Draw';
    }
    return null; // No winner yet
  }, []);

  // --- Update Status Message ---
  const updateStatus = useCallback((currentWinner: Winner, turn: boolean) => {
    if (currentWinner) {
      if (currentWinner === 'Draw') {
        setStatusMessage("It's a Draw!");
      } else {
        setStatusMessage(`${currentWinner} wins!`);
      }
    } else {
      setStatusMessage(`Turn: ${turn ? playerMark : (playerMark === 'X' ? 'O' : 'X')}`);
    }
  }, [playerMark]);


  // --- Handle Cell Click ---
  const handleCellClick = (index: number) => {
    // Check if valid move: cell is empty, it's my turn, and no winner yet
    if (board[index] || !isMyTurn || winner) {
      console.log("Invalid move attempt:", { cellValue: board[index], isMyTurn, winner });
      return;
    }

    // Update local board
    const newBoard = [...board];
    newBoard[index] = playerMark;
    setBoard(newBoard);

    // Broadcast move to opponent(s)
    console.log(`Broadcasting move: index=${index}, mark=${playerMark}`);
    broadcastData({ type: 'move', index: index, mark: playerMark });

    // Set turn to opponent
    setIsMyTurn(false);

    // Check for winner/draw locally
    const currentWinner = checkWinner(newBoard);
    setWinner(currentWinner);
    updateStatus(currentWinner, false); // Update status after move
  };


  // --- Reset Game ---
  const resetGame = () => {
    console.log("Resetting game...");
    setBoard(initialBoard);
    setWinner(null);
    const hostStarts = isHost; // Host always starts after reset
    setIsMyTurn(hostStarts);
    updateStatus(null, hostStarts);

    // Broadcast reset request (only host should ideally trigger this, but allow for now)
    broadcastData({ type: 'reset' });
  };


  // --- Effect for Data Callback Registration and Initial Status ---
  useEffect(() => {
    console.log(`Registering TicTacToe data callback. Player Mark: ${playerMark}, Is Host: ${isHost}`);

    const dataCallback = (data: any, senderId: string) => {
      console.log(`TicTacToe received data from ${senderId}:`, data); // Log all received data

      if (data.type === 'move' && data.mark !== playerMark) { // Process move from opponent
        const { index, mark } = data;
        setBoard(prevBoard => {
          const newBoard = [...prevBoard];
          if (newBoard[index] === null) { // Ensure cell isn't already taken (basic conflict check)
            newBoard[index] = mark;
            const currentWinner = checkWinner(newBoard);
            setWinner(currentWinner);
            if (!currentWinner) {
              setIsMyTurn(true); // Set turn back to this player
              updateStatus(null, true);
            } else {
               updateStatus(currentWinner, false); // Game ended on opponent's move
            }
            return newBoard;
          } else {
             console.warn(`Received move for already occupied cell ${index} from ${senderId}. Ignoring.`);
             return prevBoard; // Return previous board if conflict
          }
        });
      } else if (data.type === 'reset') {
        // Handle reset triggered by opponent
        console.log("Received reset request from opponent.");
        setBoard(initialBoard);
        setWinner(null);
        const hostStarts = isHost;
        setIsMyTurn(hostStarts);
        updateStatus(null, hostStarts);
      }
    };

    registerDataCallback(dataCallback);
    updateStatus(null, isMyTurn); // Set initial status message

    // Cleanup function if needed (though useWebRTC handles callback storage)
    // return () => { /* unregister maybe? */ };

  }, [registerDataCallback, playerMark, isHost, checkWinner, updateStatus, initialBoard]); // Added dependencies


  // --- Render Logic ---
  // Removed inline boardStyle, will use CSS classes

  return (
    <div className="game-component card tic-tac-toe-game"> {/* Added classes */}
      <h3>Tic Tac Toe</h3>
      <p className="game-status" style={{ fontWeight: 'bold', minHeight: '1.5em', marginBottom: '1rem' }}>{statusMessage}</p>
      <div className="tic-tac-toe-board"> {/* Added class for board styling */}
        {board.map((cellValue, index) => (
          <Cell
            key={index}
            value={cellValue}
            onClick={() => handleCellClick(index)}
            disabled={!!cellValue || !isMyTurn || !!winner} // Disable if cell taken, not my turn, or game over
          />
        ))}
      </div>
      {winner && (
        <div className="action-area" style={{ marginTop: '1.5rem' }}>
            <button onClick={resetGame} className="btn btn-secondary"> {/* Use btn styles */}
              Play Again?
            </button>
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame;
