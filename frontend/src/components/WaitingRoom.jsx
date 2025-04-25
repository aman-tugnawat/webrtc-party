import React from 'react';

// Pass isHost and onStartGame as props
function WaitingRoom({ sessionCode, playerCount, isHost, onStartGame }) {
  return (
    <div>
      <h1>Waiting Room</h1>
      <h2>Session Code: {sessionCode}</h2>
      <p>Share this code or link with others:</p>
      {/* Basic shareable link display */}
      <input type="text" value={`${window.location.origin}${window.location.pathname}?join=${sessionCode}`} readOnly />
      <p>Players Connected: {playerCount}</p>
      {/* Conditionally render the Start Game button only for the host */}
      {isHost && (
        <button onClick={onStartGame}>Start Game</button>
      )}
      {!isHost && (
         <p>Waiting for the host to start the game...</p>
      )}
       {/* TODO: Display player list if needed */}
    </div>
  );
}

export default WaitingRoom;
