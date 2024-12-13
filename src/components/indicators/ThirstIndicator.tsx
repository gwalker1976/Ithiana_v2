// src/components/ThirstIndicator.tsx
import React, { useEffect } from 'react';

interface ThirstIndicatorProps {
  thirst: number; // 0-tól 6-ig terjedő érték
}

const ThirstIndicator: React.FC<ThirstIndicatorProps> = ({ thirst }) => {
  const totalSquares = 6;
  const blueSquares = 2;
  const yellowSquares = 2;
  const redSquares = 2;

  // Számolja, hogy hány négyzet legyen aktív minden színnél
  const getActiveSquares = (): { blue: number; yellow: number; red: number } => {
    let remaining = thirst;

    const activeBlue = Math.min(remaining, blueSquares);
    remaining -= activeBlue;

    const activeYellow = Math.min(remaining, yellowSquares);
    remaining -= activeYellow;

    const activeRed = Math.min(remaining, redSquares);

    return {
      blue: activeBlue,
      yellow: activeYellow,
      red: activeRed,
    };
  };

  const activeSquares = getActiveSquares();

  // Négyzetek renderelése
  const renderSquares = () => {
    const squares = [];

    // Kék négyzetek
    for (let i = 0; i < blueSquares; i++) {
      squares.push(
        <div
          key={`blue-${i}`}
          className={`w-4 h-4 mr-1 mb-1 ${
            i < activeSquares.blue ? 'bg-blue-500' : 'bg-gray-300'
          } border border-gray-500`}
        />
      );
    }

    // Sárga négyzetek
    for (let i = 0; i < yellowSquares; i++) {
      squares.push(
        <div
          key={`yellow-${i}`}
          className={`w-4 h-4 mr-1 mb-1 ${
            i < activeSquares.yellow ? 'bg-yellow-500' : 'bg-gray-300'
          } border border-gray-500`}
        />
      );
    }

    // Piros négyzetek
    for (let i = 0; i < redSquares; i++) {
      squares.push(
        <div
          key={`red-${i}`}
          className={`w-4 h-4 mr-1 mb-1 ${
            i < activeSquares.red ? 'bg-red-500' : 'bg-gray-300'
          } border border-gray-500`}
        />
      );
    }

    return squares;
  };

  // Szomjúság aktuális értékének konzolra írása
  useEffect(() => {
    console.log(`Current thirst: ${thirst}`);
  }, [thirst]);

  return (
    <div>
      <p className="text-gray-300 mb-2">Szomjúság:</p>
      <div className="flex">
        {renderSquares()}
      </div>
    </div>
  );
};

export default ThirstIndicator;
