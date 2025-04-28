import React from 'react';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  disabled: boolean; // Prevent clicking on already filled cells or when it's not your turn
}

const Cell: React.FC<CellProps> = ({ value, onClick, disabled }) => {
  // Remove inline style object

  // Determine class names based on value
  const classNames = `cell ${value ? value : ''}`; // Base class 'cell', add 'X' or 'O' if value exists

  return (
    <button className={classNames} onClick={onClick} disabled={disabled}>
      {value}
    </button>
  );
};

export default Cell;
