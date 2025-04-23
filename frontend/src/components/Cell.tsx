import React from 'react';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  disabled: boolean; // Prevent clicking on already filled cells or when it's not your turn
}

const Cell: React.FC<CellProps> = ({ value, onClick, disabled }) => {
  const style: React.CSSProperties = {
    width: '80px',
    height: '80px',
    fontSize: '3em',
    fontWeight: 'bold',
    border: '2px solid #ccc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#fff', // Light background for cells
    color: value === 'X' ? '#ff4136' : '#0074d9', // Red for X, Blue for O
  };

  return (
    <button style={style} onClick={onClick} disabled={disabled}>
      {value}
    </button>
  );
};

export default Cell;
