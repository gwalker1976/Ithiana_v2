// src/components/spells/NoHunger.tsx

import React, { useEffect, useRef } from 'react';
import type { Spell, CharacterState, Item } from '../types/interface';
import { supabase } from '../../supabaseClient';

interface NoHungerProps {
  spell: Spell;
  characterState: CharacterState;
  onComplete: () => void;
  usedItemId: string; // Új prop az használt tárgy ID-jának átadásához
}

const NoHunger: React.FC<NoHungerProps> = ({ spell, characterState, onComplete, usedItemId }) => {
  const hasRun = useRef(false); // Ref a futás követésére

  useEffect(() => {
    if (hasRun.current) return; // Ha már futott, ne fusson újra
    hasRun.current = true; // Jelzés, hogy futni fog

    const executeNoHunger = async () => {
      console.log('NoHunger varázslat használva: csökkentett éhség.');

      try {
        // Lekérjük a használt tárgy adatát, hogy megkapjuk a serving_value értékét
        const { data: item, error: itemError } = await supabase
          .from<Item>('items')
          .select('serving_value')
          .eq('id', usedItemId)
          .single();

        if (itemError) {
          console.error('Hiba a tárgy lekérésekor a NoHunger varázslatnál:', itemError);
          onComplete();
          return;
        }

        const servingValue = item.serving_value || 0;

        // Csökkentjük az éhség értékét a servingValue-vel, biztosítva, hogy ne menjen 0 alá
        const newHunger = Math.max(characterState.hunger + servingValue, 0);

        // Frissítjük az adatbázist
        const { error: updateError } = await supabase
          .from('character_states')
          .update({ hunger: newHunger })
          .eq('id', characterState.id);

        if (updateError) {
          console.error('Hiba a NoHunger varázslat végrehajtásakor:', updateError);
          // Itt kezelheted a hibát, például értesítést küldhetsz a felhasználónak
        } else {
          // Optionálisan, ha használni szeretnéd a tárgyat (csökkenteni a mennyiséget)
          const { data: updatedState, error: stateError } = await supabase
            .from('character_states')
            .select('inventory')
            .eq('id', characterState.id)
            .single();

          if (stateError) {
            console.error('Hiba a karakter állapot lekérésénél:', stateError);
          } else {
            // Távolítsuk el egy példányát az inventory-ból
            const itemIndex = updatedState.inventory.indexOf(usedItemId);
            if (itemIndex !== -1) {
              const newInventory = [...updatedState.inventory];
              newInventory.splice(itemIndex, 1);
              const { error: inventoryError } = await supabase
                .from('character_states')
                .update({ inventory: newInventory })
                .eq('id', characterState.id);

              if (inventoryError) {
                console.error('Hiba az inventory frissítésekor a NoHunger varázslatnál:', inventoryError);
              }
            }
          }

          onComplete();
        }
      } catch (error) {
        console.error('Váratlan hiba a NoHunger varázslat végrehajtásakor:', error);
        onComplete();
      }
    };

    executeNoHunger();
  }, [spell, characterState, onComplete, usedItemId]);

  return null; // Ez a komponens nem jelenít meg semmit
};

export default NoHunger;
