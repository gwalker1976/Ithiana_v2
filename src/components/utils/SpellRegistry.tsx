// src/components/SpellRegistry.tsx

import React from 'react';
import NoThirst from '../spells/NoThirst';
import NoHunger from '../spells/NoHunger'; // Importáljuk a NoHunger komponenst

// További varázslatok importálása

import type { Spell, CharacterState } from '../types/interface';

interface SpellRegistryProps {
  spell: Spell;
  characterState: CharacterState;
  onSpellComplete: () => void;
  usedItemId: string; // Új prop az használt tárgy ID-jának átadásához
}

const SpellRegistry: React.FC<SpellRegistryProps> = ({ spell, characterState, onSpellComplete, usedItemId }) => {
  switch (spell.name) {
    case 'NoThirst':
      return (
        <NoThirst
          spell={spell}
          characterState={characterState}
          onComplete={onSpellComplete}
          usedItemId={usedItemId} // Átadjuk az usedItemId-t
        />
      );
    case 'NoHunger':
      return (
        <NoHunger
          spell={spell}
          characterState={characterState}
          onComplete={onSpellComplete}
          usedItemId={usedItemId} // Átadjuk az usedItemId-t
        />
      );
    // További varázslatok kezelése
    default:
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 text-white p-6 rounded-lg">
            Ismeretlen varázslat: {spell.name}
            <button
              onClick={onSpellComplete}
              className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              Bezárás
            </button>
          </div>
        </div>
      );
  }
};

export default SpellRegistry;
