// src/components/TemperatureIndicator.tsx
import React, { useEffect } from 'react';

interface TemperatureIndicatorProps {
  temperature: number; // 0-tól 18-ig terjedő érték
}

const TemperatureIndicator: React.FC<TemperatureIndicatorProps> = ({ temperature }) => {
  const blueCount = 6;
  const yellowCount = 6;
  const redCount = 6;

  // Számolja, mennyi aktív négyzet legyen az adott színnél
  const getActiveCount = (colorIndex: number): number => {
    if (colorIndex === 0) { 
      // Kék sáv (hideg)
      return Math.min(temperature, blueCount);
    } else if (colorIndex === 1) { 
      // Sárga sáv (kényelmes)
      return Math.min(Math.max(temperature - blueCount, 0), yellowCount);
    } else { 
      // Piros sáv (meleg)
      return Math.min(Math.max(temperature - blueCount - yellowCount, 0), redCount);
    }
  };

  const renderSquares = (color: 'blue' | 'yellow' | 'red', colorIndex: number) => {
    const activeCount = getActiveCount(colorIndex);
    const totalCount = color === 'blue' ? blueCount : color === 'yellow' ? yellowCount : redCount;
    const colorClass = color === 'blue' 
      ? 'bg-blue-500' 
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

  // Hőérzet aktuális értékének konzolra írása
  useEffect(() => {
    console.log(`Current temperature: ${temperature}`);
  }, [temperature]);

  return (
    <div>
      <p className="text-gray-300 mb-2">Hőérzet:</p>
      <div className="flex flex-col">
        {renderSquares('blue', 0)}
        {renderSquares('yellow', 1)}
        {renderSquares('red', 2)}
      </div>
    </div>
  );
};

export default TemperatureIndicator;
