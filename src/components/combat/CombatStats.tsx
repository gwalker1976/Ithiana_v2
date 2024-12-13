// src/components/combat/CombatStats.tsx

import React from 'react';
import type { CharacterData, Monster, Damage } from '../types/interface';

interface CombatStatsProps {
  character: CharacterData;
  monster: Monster;
  currentHealth: number;
  maxHealth: number;
  monsterHealth: number;
  totalAttack: number; // Új prop
  totalDefense: number; // Új prop
  weaponDamage?: Damage;
}

const CombatStats: React.FC<CombatStatsProps> = ({
  character,
  monster,
  currentHealth,
  maxHealth,
  monsterHealth,
  totalAttack,
  totalDefense,
  weaponDamage,
}) => {
  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      {/* Karakter Statisztikák */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <img
            src={character.profile_image_url || 'https://via.placeholder.com/100'} // profile_image_url használata
            alt={character.name}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div>
            <h2 className="text-xl font-bold text-white">{character.name}</h2>
            <p className="text-gray-300">HP: {currentHealth} / {maxHealth}</p>
            <p className="text-gray-300">Támadás: +{totalAttack}</p>
            <p className="text-gray-300">Védelem: {totalDefense}</p>
            {/* További statok, például Fegyver sebzés */}
            {weaponDamage && (
              <p className="text-gray-300">
                Fegyver Sebzés: {weaponDamage.count}{weaponDamage.type} + {weaponDamage.modifier}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Szörny Statisztikák */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <img
            src={monster.profile_image_url || 'https://via.placeholder.com/100'}
            alt={monster.name}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div>
            <h2 className="text-xl font-bold text-white">{monster.name}</h2>
            <p className="text-gray-300">HP: {monsterHealth}</p>
            <p className="text-gray-300">Támadás: +{monster.attack}</p>
            <p className="text-gray-300">Védelem: {monster.defense}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatStats;
