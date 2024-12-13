// src/components/CombatControls.tsx

import React from 'react';
import { Ability } from '../types/interface';

interface CombatControlsProps {
  initiativeRolled: boolean;
  isPlayerTurn: boolean;
  abilities: Ability[];
  abilityCooldowns: Record<string, number>;
  onRollInitiative: () => void;
  onBasicAttack: () => void;
  onUseAbility: (ability: Ability) => void;
  onEscape: () => void;
}

const CombatControls: React.FC<CombatControlsProps> = ({
  initiativeRolled,
  isPlayerTurn,
  abilities,
  abilityCooldowns,
  onRollInitiative,
  onBasicAttack,
  onUseAbility,
  onEscape,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Kezdeményezés vagy képességek */}
      {!initiativeRolled ? (
        <button
          onClick={onRollInitiative}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Kezdeményezés dobás
        </button>
      ) : isPlayerTurn ? (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={onBasicAttack}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Alap támadás
          </button>
          {abilities.map(ability => (
            <button
              key={ability.id}
              onClick={() => onUseAbility(ability)}
              disabled={abilityCooldowns[ability.id] > 0}
              className={`flex items-center px-4 py-2 text-white rounded-lg transition ${
                ability.type === 'Védekezés'
                  ? abilityCooldowns[ability.id] > 0
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                  : abilityCooldowns[ability.id] > 0
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
              title={ability.description}
            >
              {ability.profile_image_url && (
                <img
                  src={ability.profile_image_url}
                  alt={ability.name}
                  className="w-5 h-5 mr-2"
                />
              )}
              {ability.name}
              {abilityCooldowns[ability.id] > 0 && ` (${abilityCooldowns[ability.id]}k)`}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-white text-center">Szörny köre...</p>
      )}
      
      <button
        onClick={onEscape}
        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
      >
        Menekülés
      </button>
    </div>
  );
};

export default CombatControls;