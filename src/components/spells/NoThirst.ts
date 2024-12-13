// src/components/spells/NoThirst.tsx

import React, { useEffect } from 'react';
import type { Spell, CharacterState } from '.././types/interface';
import { supabase } from '../../supabaseClient';

interface NoThirstProps {
  spell: Spell;
  characterState: CharacterState;
  onComplete: () => void;
}

const NoThirst: React.FC<NoThirstProps> = ({ spell, characterState, onComplete }) => {
  useEffect(() => {
    const executeNoThirst = async () => {
      console.log('NoThirst varázslat használva: csökkentett szomjúság.');

      // Csökkentjük a thirst értékét eggyel, biztosítva, hogy ne menjen 0 alá
      const newThirst = Math.max(characterState.thirst + 1, 0);

      // Frissítjük az adatbázist
      const { error } = await supabase
        .from('character_states')
        .update({ thirst: newThirst })
        .eq('id', characterState.id);

      if (error) {
        console.error('Hiba a NoThirst varázslat végrehajtásakor:', error);
        // Itt kezelheted a hibát, például értesítést küldhetsz a felhasználónak
      } else {
        // Frissítjük a helyi állapotot
        // Fontos: Ha a `characterState` csak egy helyi állapot, akkor frissítened kell azt is
        // Ha nem, akkor a fő állapotkezelő komponensnek kell frissítenie
        // Például, ha a `PlayGame` komponens kezelja a `characterState`-et, akkor egy callback-et kell hívnod
        // Itt feltételezzük, hogy a `characterState` frissítése külsőleg történik
        onComplete();
      }
    };

    executeNoThirst();
  }, [characterState, onComplete]);
};

export default NoThirst;
