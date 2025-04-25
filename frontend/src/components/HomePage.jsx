import React, { useState } from 'react';

function HomePage({ onCreateSession, onJoinSession }) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinClick = () => {
    if (joinCode.trim()) {
      onJoinSession(joinCode.trim().toUpperCase());
    } else {
      alert('Please enter a session code.');
    }
  };

  return (
    <div>
      <h1>Welcome to the Game!</h1>
      <button onClick={onCreateSession}>Create New Game</button>
      <hr />
      <div>
        <input
          type="text"
          placeholder="Enter Session Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          maxLength={4} // Assuming 4-char codes
          style={{ textTransform: 'uppercase' }}
        />
        <button onClick={handleJoinClick}>Join Game</button>
      </div>
    </div>
  );
}

export default HomePage;
