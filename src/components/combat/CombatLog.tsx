// CombatLog.tsx

import React, { useEffect, useRef } from 'react';

interface CombatMessage {
  type: 'damage' | 'heal' | 'info';
  message: string;
}

interface CombatLogProps {
  messages: CombatMessage[];
}

const CombatLog: React.FC<CombatLogProps> = ({ messages }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Automatikus görgetés a log végére
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Meghatározzuk a színt az üzenet típusától függően
  const getMessageColor = (type: string) => {
    switch (type) {
      case 'damage':
        return 'text-red-500';
      case 'heal':
        return 'text-green-500';
      case 'info':
      default:
        return 'text-white';
    }
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg h-64 overflow-y-auto text-white">
      {messages.map((msg, index) => (
        <p key={index} className={`text-sm ${getMessageColor(msg.type)}`}>
          {msg.message}
        </p>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default CombatLog;
