// src/utils/storageUtils.ts
import { supabase } from '../../supabaseClient';
import { StorageContent } from '../types/interface';

/**
 * Lekérdezi a tárolóban lévő tárgyak jelenlegi mennyiségét a karakterhez
 * @param storageItemId - A tároló tárgy ID-ja
 * @param characterId - A karakter ID-ja
 * @returns A tárolóban lévő tárgyak összesített mennyisége
 */
export async function getStorageCurrentCount(storageItemId: string, characterId: string): Promise<number> {
  const { data, error } = await supabase
    .from('storage_contents')
    .select('quantity')
    .eq('storage_item_id', storageItemId)
    .eq('character_id', characterId);

  if (error) {
    console.error('Hiba a storage count lekérdezésekor:', error);
    return 0;
  }

  if (!data) return 0;

  const total = data.reduce((sum, row) => sum + row.quantity, 0);
  return total;
}

/**
 * Tárgy hozzáadása a tárolóhoz a karakterhez
 * @param storageItemId - A tároló tárgy ID-ja
 * @param containedItemId - A tárolni kívánt tárgy ID-ja
 * @param characterId - A karakter ID-ja
 */
export async function addItemToStorage(storageItemId: string, containedItemId: string, characterId: string) {
  const { data, error } = await supabase
    .from('storage_contents')
    .select('*')
    .eq('storage_item_id', storageItemId)
    .eq('contained_item_id', containedItemId)
    .eq('character_id', characterId)
    .single();

  if (error && error.code !== 'PGRST116') { // Feltételezzük, hogy 'PGRST116' a 'no rows found' hiba
    console.error('Hiba a storage lekérdezésekor:', error);
    return;
  }

  if (data) {
    const { error: updateError } = await supabase
      .from('storage_contents')
      .update({ quantity: data.quantity + 1 })
      .eq('id', data.id);

    if (updateError) {
      console.error('Hiba a storage frissítésekor:', updateError);
    }
  } else {
    const { error: insertError } = await supabase
      .from('storage_contents')
      .insert({
        storage_item_id: storageItemId,
        contained_item_id: containedItemId,
        quantity: 1,
        character_id: characterId
      });

    if (insertError) {
      console.error('Hiba a storage insert során:', insertError);
    }
  }
}

/**
 * Lekérdezi a tároló tartalmát a karakterhez
 * @param storageItemIds - A tároló tárgyak ID-jai
 * @param characterId - A karakter ID-ja
 * @returns A tárolók tartalma
 */
export async function getStorageContents(storageItemIds: string[], characterId: string): Promise<StorageContent[]> {
  const { data, error } = await supabase
    .from('storage_contents')
    .select('storage_item_id, contained_item_id, quantity, id, character_id')
    .in('storage_item_id', storageItemIds)
    .eq('character_id', characterId);

  if (error) {
    console.error('Hiba a storage_contents lekérdezésekor:', error);
    return [];
  }

  return data as StorageContent[] || [];
}

/**
 * Elhasznál egy tárgyat a tárolóból
 * @param storageItemId - A tároló tárgy ID-ja
 * @param containedItemId - A használni kívánt tárgy ID-ja
 * @param characterId - A karakter ID-ja
 * @param amount - Az elhasználni kívánt mennyiség (alapértelmezett: 1)
 */
export async function consumeItemFromStorage(storageItemId: string, containedItemId: string, characterId: string, amount = 1) {
  const { data, error } = await supabase
    .from('storage_contents')
    .select('*')
    .eq('storage_item_id', storageItemId)
    .eq('contained_item_id', containedItemId)
    .eq('character_id', characterId)
    .single();

  if (error) {
    console.error('Hiba a storage lekérdezésekor használat során:', error);
    return;
  }

  if (!data) return;

  const newQuantity = data.quantity - amount;
  if (newQuantity <= 0) {
    const { error: deleteError } = await supabase
      .from('storage_contents')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.error('Hiba a tárgy törlésekor a storage-ból:', deleteError);
    }
  } else {
    const { error: updateError } = await supabase
      .from('storage_contents')
      .update({ quantity: newQuantity })
      .eq('id', data.id);

    if (updateError) {
      console.error('Hiba a storage update során:', updateError);
    }
  }
}
