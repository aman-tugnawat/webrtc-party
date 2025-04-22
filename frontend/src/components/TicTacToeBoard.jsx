import React from 'react';
import './TicTacToeBoard.css'; // We'll create this CSS file later if needed

function TicTacToeBoard({ board, handleMove, isMyTurn, currentPlayerMark }) {

  const handleClick = (index) => {
    // Only allow move if it's my turn, the cell is empty, and the game is likely ongoing
    if (isMyTurn && !board[index]) {
      console.log(`Board: Cell ${index} clicked by ${currentPlayerMark}`);
      handleMove(index);
    } else {
       console.log(`Board: Cell ${index} click ignored (isMyTurn: ${isMyTurn}, board[${index}]: ${board[index]})`);
    }
  };

  return (
    <div className="tic-tac-toe-board">
      {board.map((cell, index) => (
        <button
          key={index}
          className={`cell ${cell ? 'cell-' + cell.toLowerCase() : ''}`} // Add class for X or O
          onClick={() => handleClick(index)}
          disabled={!isMyTurn || !!cell} // Disable if not my turn or cell is filled
        >
          {cell}
        </button>
      ))}
    </div>
  );
}

export default TicTacToeBoard;
