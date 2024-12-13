// src/utils/inventoryArrangement.ts
import { supabase } from '../../supabaseClient';
import { getStorageCurrentCount, addItemToStorage } from './storageUtils';
import { CharacterState, DbItem } from '../types/interface';

/**
 * Ez a függvény megpróbálja a characterState.inventory-ban lévő tárgyakat
 * storage-ba rakni, ha van megfelelő storage a character inventory-jában.
 * Ha sikerül tárgyakat storage-ba tenni, frissíti az inventory-t az adatbázisban.
 */
export async function arrangeItemsInStorage(characterState: CharacterState) {
  const inventoryItemIds = characterState.inventory;
  if (!inventoryItemIds || inventoryItemIds.length === 0) return;

  // Lekérdezzük az inventory tárgyait
  const { data: itemsData, error: itemsError } = await supabase
    .from('items')
    .select('id, type, allowed_items, capacity')
    .in('id', inventoryItemIds);

  if (itemsError) {
    console.error('Hiba az inventory tárgyak lekérésekor:', itemsError);
    return;
  }

  const storageItems = (itemsData || []).filter(i => i.type.toLowerCase() === 'storage');
  if (storageItems.length === 0) return; // Nincs storage, nincs mit tenni

  const nonStorageItems = (itemsData || []).filter(i => i.type.toLowerCase() !== 'storage');

  let updatedInventory = [...inventoryItemIds];
  const itemCount: { [key: string]: number } = {};
  for (const id of inventoryItemIds) {
    itemCount[id] = (itemCount[id] || 0) + 1;
  }

  // Megpróbáljuk betenni a non-storage tárgyakat a storage-ba
  for (const item of nonStorageItems) {
    for (const storage of storageItems) {
      if (!storage.allowed_items || storage.allowed_items.length === 0) continue;

      // Ellenőrizni, hogy az item.id szerepel az allowed_items-ben
      if (!storage.allowed_items.includes(item.id)) continue;

      const cap = storage.capacity || 0;
      if (cap <= 0) continue;

      // Lekérjük a jelenlegi tárolt mennyiséget a karakterhez
      const currentCount = await getStorageCurrentCount(storage.id, characterState.id);
      if (currentCount < cap) {
        // Mennyi fér be?
        let canAdd = Math.min(itemCount[item.id], cap - currentCount);

        while (canAdd > 0 && itemCount[item.id] > 0) {
          await addItemToStorage(storage.id, item.id, characterState.id);
          // Vegyünk ki egyet az inventoryból
          const index = updatedInventory.indexOf(item.id);
          if (index !== -1) {
            updatedInventory.splice(index, 1);
            itemCount[item.id]--;
          }
          canAdd--;
        }

        if (itemCount[item.id] <= 0) {
          // Minden darabot beraktunk
          break;
        }
      }
    }
  }

  // Ha változott az inventory mérete
  if (updatedInventory.length !== inventoryItemIds.length) {
    const { error: updateError } = await supabase
      .from('character_states')
      .update({ inventory: updatedInventory })
      .eq('id', characterState.id);

    if (updateError) {
      console.error('Hiba az inventory frissítésekor (storage rendezés):', updateError);
    }
  }
}
