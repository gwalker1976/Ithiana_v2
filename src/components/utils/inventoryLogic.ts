// src/utils/inventoryLogic.ts
import { supabase } from '../../supabaseClient';
import { getStorageCurrentCount, addItemToStorage } from './storageUtils';
import { CharacterState } from '../types/interface';

interface ItemRecord {
  id: string;
  type: string;
  allowed_items?: string[];
  capacity?: number;
}

export async function addItemToCharacter(characterState: CharacterState, newItemId: string) {
  const { data: newItemData, error: newItemError } = await supabase
    .from('items')
    .select('id, type')
    .eq('id', newItemId)
    .single();

  if (newItemError || !newItemData) {
    console.error('Hiba az új tárgy lekérdezésekor:', newItemError);
    return;
  }

  const newItem = newItemData as ItemRecord;
  const inventoryItemIds = characterState.inventory || [];

  // Lekérdezzük az inventory-ban lévő tárgyak adatait
  const { data: inventoryItems, error: invError } = await supabase
    .from('items')
    .select('id, type, allowed_items, capacity')
    .in('id', inventoryItemIds);

  if (invError) {
    console.error('Hiba az inventory tárgyainak lekérdezésekor:', invError);
    return;
  }

  const storageItems = (inventoryItems || []).filter(i => i.type.toLowerCase() === 'storage');

  // Megpróbáljuk betenni a newItem-et valamelyik storage-ba
  for (const storage of storageItems) {
    if (!storage.allowed_items || storage.allowed_items.length === 0) continue;

    // allowed_items ellenőrzése
    if (!storage.allowed_items.includes(newItem.id)) {
      continue;
    }

    const cap = storage.capacity || 0;
    if (cap <= 0) continue;

    const currentCount = await getStorageCurrentCount(characterState.id, storage.id);
    if (currentCount < cap) {
      // Van hely a storage-ban
      await addItemToStorage(characterState.id, storage.id, newItem.id);
      return; // Nem kell inventory-ba rakni
    }
  }

  // Ha ide eljut, egyik storage sem volt alkalmas
  const newInventory = [...inventoryItemIds, newItemId];
  const { error: updateError } = await supabase
    .from('character_states')
    .update({ inventory: newInventory })
    .eq('id', characterState.id);

  if (updateError) {
    console.error('Hiba az inventory frissítésekor:', updateError);
  }
}
