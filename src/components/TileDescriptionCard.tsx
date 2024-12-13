// TileDescriptionCard.tsx

import React from 'react';
import { Info } from 'lucide-react'; // Opció: hozzáadhatsz egy info ikont

interface TileDescriptionCardProps {
  description: string;
}

const TileDescriptionCard: React.FC<TileDescriptionCardProps> = ({ description }) => {
  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg max-w-md mx-auto flex items-center">
      <Info className="w-6 h-6 mr-2" />
      <p className="text-lg italic">{description}</p>
    </div>
  );
};

export default TileDescriptionCard;
