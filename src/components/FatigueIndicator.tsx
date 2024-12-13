// src/components/FatigueIndicator.tsx
import React, { useEffect } from 'react';

interface FatigueIndicatorProps {
  fatigue: number; // 0-tól 18-ig terjedő érték
}

const FatigueIndicator: React.FC<FatigueIndicatorProps> = ({ fatigue }) => {
  const greenCount = 6;
  const yellowCount = 6;
  const redCount = 6;

  // Számolja, mennyi aktív négyzet legyen az adott színnél
  const getActiveCount = (colorIndex: number): number => {
    if (colorIndex === 0) { 
      // Zöld sáv
      return Math.min(fatigue, greenCount);
    } else if (colorIndex === 1) { 
      // Sárga sáv
      return Math.min(Math.max(fatigue - greenCount, 0), yellowCount);
    } else { 
      // Piros sáv
      return Math.min(Math.max(fatigue - greenCount - yellowCount, 0), redCount);
    }
  };

  const renderSquares = (color: 'green' | 'yellow' | 'red', colorIndex: number) => {
    const activeCount = getActiveCount(colorIndex);
    const totalCount = color === 'green' ? greenCount : color === 'yellow' ? yellowCount : redCount;
    const colorClass = color === 'green' 
      ? 'bg-green-500' 
      : color === 'yellow' 
      ? 'bg-yellow-500' 
      : 'bg-red-500';

    const squares = [];
    for (let i = 0; i < totalCount; i++) {
      squares.push(
        <div
          key={i}
          className={`w-4 h-4 mr-1 mb-1 ${i < activeCount ? colorClass : 'bg-gray-300'} border border-gray-500`}
        />
      );
    }
    return (
      <div className="flex mb-1" key={color}>
        {squares}
      </div>
    );
  };

  // Fáradtság aktuális értékének konzolra írása
  useEffect(() => {
    console.log(`Current fatigue: ${fatigue}`);
  }, [fatigue]);

  return (
    <div>
      <p className="text-gray-300 mb-2">Fáradtság:</p>
      <div className="flex flex-col">
        {renderSquares('green', 2)}
        {renderSquares('yellow', 1)}
        {renderSquares('red', 0)}
      </div>
    </div>
  );
};

export default FatigueIndicator;
