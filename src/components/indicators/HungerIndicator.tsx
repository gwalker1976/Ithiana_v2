// src/components/HungerIndicator.tsx
import React, { useEffect } from 'react';

interface HungerIndicatorProps {
  hunger: number; // 0-tól 6-ig terjedő érték
}

const HungerIndicator: React.FC<HungerIndicatorProps> = ({ hunger }) => {
  const totalSquares = 6;
  const greenSquares = 2;
  const yellowSquares = 2;
  const redSquares = 2;

  // Számolja, hogy hány négyzet legyen aktív minden színnél
  const getActiveSquares = (): { green: number; yellow: number; red: number } => {
    let remaining = hunger;

    const activeGreen = Math.min(remaining, greenSquares);
    remaining -= activeGreen;

    const activeYellow = Math.min(remaining, yellowSquares);
    remaining -= activeYellow;

    const activeRed = Math.min(remaining, redSquares);

    return {
      green: activeGreen,
      yellow: activeYellow,
      red: activeRed,
    };
  };

  const activeSquares = getActiveSquares();

  // Négyzetek renderelése
  const renderSquares = () => {
    const squares = [];

    // Zöld négyzetek
    for (let i = 0; i < greenSquares; i++) {
      squares.push(
        <div
          key={`green-${i}`}
          className={`w-4 h-4 mr-1 mb-1 ${
            i < activeSquares.green ? 'bg-green-500' : 'bg-gray-300'
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

  // Éhség aktuális értékének konzolra írása
  useEffect(() => {
    console.log(`Current hunger: ${hunger}`);
  }, [hunger]);

  return (
    <div>
      <p className="text-gray-300 mb-2">Éhség:</p>
      <div className="flex">
        {renderSquares()}
      </div>
    </div>
  );
};

export default HungerIndicator;
