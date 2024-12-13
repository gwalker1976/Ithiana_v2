// src/components/TimeDisplay.tsx
import React from 'react';

interface TimeState {
  year: number;
  season: string;
  day: number;
  hour: number;
}

interface TimeDisplayProps {
  time: TimeState;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({ time }) => {
  const { year, season, day, hour } = time;

  return (
    <div className="flex items-center space-x-2 bg-gray-800 bg-opacity-75 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="font-bold">Év:</div>
      <div>{year}</div>
      <div className="font-bold">Évszak:</div>
      <div>{season}</div>
      <div className="font-bold">Nap:</div>
      <div>{day}</div>
      <div className="font-bold">Óra:</div>
      <div>{hour}:00</div>
    </div>
  );
};

export default TimeDisplay;
