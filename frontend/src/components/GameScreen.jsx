import React from 'react';
import TicTacToeBoard from './TicTacToeBoard';
import PingPongGame from './PingPongGame'; // Import PingPongGame

function GameScreen({
  sessionCode,
  isHost,
  peerConnectionStatus,
  gameType,
  // Tic Tac Toe Props
  boardState,
  myMark,
  isMyTurn,
  winner,
  handleMove,
  // Ping Pong Props
  paddleY,
  ball,
  score
  // TODO: Add handlePaddleMove prop
}) {

  // --- Tic Tac Toe Status ---
  const renderTicTacToeStatus = () => {
    if (winner) {
      if (winner === 'Draw') {
        return <h2>It's a Draw!</h2>;
      }
      return <h2>{winner} Wins!</h2>;
    } else {
      // Only show turn status if gameType is TicTacToe
      return gameType === 'TicTacToe' ? <h2>{isMyTurn ? `Your turn (${myMark})` : `Opponent's turn (${myMark === 'X' ? 'O' : 'X'})`}</h2> : null;
    }
  };

   // --- Ping Pong Status ---
   const renderPingPongStatus = () => {
     return <h2>Score: {score?.player1 ?? 0} - {score?.player2 ?? 0}</h2>;
   };


  return (
    <div>
      <h1>Game Screen</h1>
      <p>Session Code: {sessionCode} | Role: {isHost ? 'Host' : 'Player'} | Peer Status: {peerConnectionStatus}</p>

      {/* Render Tic Tac Toe if gameType matches */}
      {gameType === 'TicTacToe' && (
        <>
          {renderTicTacToeStatus()}
          <TicTacToeBoard
            board={boardState}
            handleMove={handleMove}
            isMyTurn={isMyTurn}
            currentPlayerMark={myMark} // Pass the player's mark
          />
        </>
      )}

       {/* Render Ping Pong if gameType matches */}
       {gameType === 'PingPong' && (
         <>
           {renderPingPongStatus()}
           <PingPongGame
             paddleY={paddleY}
             ball={ball}
             // TODO: Pass handlePaddleMove down
           />
         </>
       )}

      {/* Fallback if gameType is not set or unknown */}
      {!gameType && (
         <p>Waiting for game content...</p>
      )}

      {/* TODO: Add other game logic, signaling handling display, etc. */}
    </div>
  );
}

export default GameScreen;
