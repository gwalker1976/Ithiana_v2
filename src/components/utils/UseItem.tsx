// src/components/utils/UseItem.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { getStorageContents, consumeItemFromStorage } from '../utils/storageUtils';
import SpellRegistry from '../utils/SpellRegistry'; // SpellRegistry importálása
import type { CharacterState, Item, Spell, StorageContent } from '../types/interface';

interface UseItemProps {
  itemId: string;
  characterState: CharacterState;
  onClose: () => void;
}

const UseItem: React.FC<UseItemProps> = ({ itemId, characterState, onClose }) => {
  const [item, setItem] = useState<Item | null>(null);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageContents, setStorageContents] = useState<StorageContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Varázslatok lekérése a tárgy special_effects mezője alapján.
   * Itt feltételezzük, hogy a special_effects varázslatneveket tartalmaz.
   */
  const fetchSpellsByName = async (specialEffects: string[]) => {
    if (specialEffects.length === 0) return;
    const { data, error } = await supabase
      .from('spells')
      .select('*')
      .in('name', specialEffects);

    if (error) {
      console.error('Hiba a varázslatok lekérésekor:', error);
      setError('Hiba a varázslatok lekérésekor');
      return;
    }

    if (data) {
      setSpells(data as Spell[]);
    }
  };

  /**
   * Tárgy adatainak lekérése
   */
  const loadItem = async (id: string): Promise<Item | null> => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Hiba a tárgy lekérésekor:', error);
      setError('Hiba a tárgy lekérésekor');
      return null;
    }
    return data as Item;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedItem = await loadItem(itemId);
      if (!fetchedItem) {
        setLoading(false);
        return;
      }

      setItem(fetchedItem);

      if (fetchedItem.type.toLowerCase() === 'storage') {
        // Lekérdezzük a storage tartalmát a karakterhoz
        const contents = await getStorageContents([itemId], characterState.id);
        setStorageContents(contents);
      }

      // Ha vannak special_effects, lekérdezzük a hozzátartozó varázslatokat
      if (fetchedItem.special_effects && fetchedItem.special_effects.length > 0) {
        await fetchSpellsByName(fetchedItem.special_effects);
      }

      setLoading(false);
    };

    loadData();
  }, [itemId, characterState.id]);

  const handleSpellComplete = () => {
    setActiveSpell(null);
    onClose();
  };

  /**
   * Tárolt tárgy használata
   */
  const handleUseStoredItem = async (containedItemId: string) => {
    // Elhasználjuk a tárolt tárgyat
    await consumeItemFromStorage(itemId, containedItemId, characterState.id, 1);
    const contents = await getStorageContents([itemId], characterState.id);
    setStorageContents(contents);

    // Miután elhasználtunk egy tárolt tárgyat, megvizsgáljuk, vannak-e special_effects a tárolt tárgyhoz.
    const usedItem = await loadItem(containedItemId);
    if (usedItem && usedItem.special_effects && usedItem.special_effects.length > 0) {
      // Lekérdezzük a varázslatokat ehhez a tárgyhoz
      const { data: spellData, error: spellError } = await supabase
        .from('spells')
        .select('*')
        .in('name', usedItem.special_effects);

      if (spellError) {
        console.error('Hiba a varázslatok lekérésekor:', spellError);
        setError('Hiba a varázslatok lekérésekor');
        return;
      }

      if (spellData && spellData.length > 0) {
        // Kiválasztjuk az első varázslatot vagy a megfelelőt
        setSpells(spellData as Spell[]);
        setActiveSpell(spellData[0]); // Automatikusan az első spell-t jelenítjük meg
      } else {
        // Nincs hozzá tartozó varázslat a spells táblában
        // Esetleg hibaüzenet vagy bezárás
      }
    }
  };

  if (loading) {
    return <div className="text-white text-center">Betöltés...</div>;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-gray-800 text-white p-6 rounded-lg max-w-md w-full">
          <p>{error}</p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600"
          >
            Bezárás
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  // Ha aktív varázslat van, megjelenítjük a SpellRegistry-t
  if (activeSpell && characterState) {
    return (
      <SpellRegistry
        spell={activeSpell}
        characterState={characterState}
        onSpellComplete={handleSpellComplete}
        usedItemId={item.id}
      />
    );
  }

  if (item.type.toLowerCase() !== 'storage') {
    // Nem storage típusú tárgy használata
    // Ha vannak special_effects-ből betöltött varázslatok, megjelenítjük az elsőt.
    if (spells.length > 0 && characterState) {
      // Kiválaszthatjuk az első varázslatot, vagy akár listát adhatunk a felhasználónak.
      // Most egyszerűen az első varázslatot aktiváljuk.
      setActiveSpell(spells[0]);
      return null; // A komponens újrarenderel aktív varázslattal
    }

    // Ha nincs special_effects vagy varázslat:
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-gray-800 text-white p-6 rounded-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">{item.name} használata</h2>
          <p>Ez a tárgy nem rendelkezik speciális varázslatokkal vagy hatásokkal.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            Bezárás
          </button>
        </div>
      </div>
    );
  }

  // Storage típusú tárgy
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 text-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{item.name} tartalma</h2>
        {storageContents.length === 0 ? (
          <p>Nincs tárgy ebben a tárolóban.</p>
        ) : (
          <ul className="space-y-2">
            {storageContents.map((sc: StorageContent) => (
              <li key={sc.id} className="flex justify-between items-center">
                <span>Tárgy ID: {sc.contained_item_id}, Mennyiség: {sc.quantity}</span>
                <button
                  onClick={() => handleUseStoredItem(sc.contained_item_id)}
                  className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Használ
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
};

export default UseItem;
