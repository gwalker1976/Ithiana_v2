// src/components/InventoryUtil.tsx 

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, ShieldQuestion, Zap } from 'lucide-react'; // Zap ikon importálása
import type { CharacterState, InventoryDisplayItem, Item } from './types/interface';
import UseItem from './utils/UseItem'; // UseItem komponens importálása
import { getStorageContents } from './utils/storageUtils'; // Import getStorageContents

interface InventoryUtilProps {
  characterState: CharacterState;
  onClose: () => void;
}

export const InventoryUtil: React.FC<InventoryUtilProps> = ({ characterState, onClose }) => {
  const [items, setItems] = useState<InventoryDisplayItem[]>([]); // Frissítve InventoryDisplayItem típusra
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCharacterState, setCurrentCharacterState] = useState(characterState);
  const [usedItemId, setUsedItemId] = useState<string | null>(null); // Állapot a használt tárgy ID-jának tárolására
  const MAX_INVENTORY_SLOTS = 20;

  /**
   * Utility függvény a combat statok kiszámolására és frissítésére
   * @param state - A karakter jelenlegi állapota
   */
  const calculateAndUpdateCombatStats = async (state: CharacterState) => {
    const equippedItems = state.equipped_items || {};

    // Felszerelt tárgyak ID-jeinek összegyűjtése
    const equippedItemIds = Object.values(equippedItems).filter(
      (id) => id !== null && id !== undefined
    );

    if (equippedItemIds.length === 0) {
      // Nincsenek felszerelt tárgyak, alapértelmezett értékek beállítása
      const { error: updateError } = await supabase
        .from('character_states')
        .update({
          total_attack: 0,
          total_defense: 0,
        })
        .eq('id', state.id);

      if (updateError) {
        console.error('Hiba a combat statok frissítésekor:', updateError);
      }

      // Helyi állapot frissítése
      setCurrentCharacterState((prevState) => ({
        ...prevState,
        total_attack: 0,
        total_defense: 0,
      }));

      return;
    }

    // Felszerelt tárgyak adatainak lekérése
    const { data: itemsData, error } = await supabase
      .from('items')
      .select('attack, defense, damage')
      .in('id', equippedItemIds);

    if (error) {
      console.error('Hiba a felszerelt tárgyak lekérésekor:', error);
      return;
    }

    // Összesített támadás és védelem kiszámolása
    let totalAttack = 0;
    let totalDefense = 0;

    itemsData.forEach((item) => {
      if (item.attack) {
        totalAttack += item.attack;
      }
      if (item.defense) {
        totalDefense += item.defense;
      }
      // Ha a tárgy rendelkezik damage modifier-rel, azt is hozzáadjuk a támadáshoz
      if (item.damage && item.damage.modifier) {
        totalAttack += item.damage.modifier;
      }
    });

    // character_states frissítése az új értékekkel
    const { error: updateError } = await supabase
      .from('character_states')
      .update({
        total_attack: totalAttack,
        total_defense: totalDefense,
      })
      .eq('id', state.id);

    if (updateError) {
      console.error('Hiba a combat statok frissítésekor:', updateError);
    } else {
      // Helyi állapot frissítése
      setCurrentCharacterState((prevState) => ({
        ...prevState,
        total_attack: totalAttack,
        total_defense: totalDefense,
      }));
    }
  };

  /**
   * Karakter állapotának lekérése
   */
  const fetchCharacterState = async () => {
    const { data, error } = await supabase
      .from('character_states')
      .select('*')
      .eq('id', characterState.id)
      .single();

    if (error) {
      setError('Hiba a karakter állapot lekérésekor');
      return null;
    }

    setCurrentCharacterState(data);
    return data;
  };

  /**
   * Tárgyak lekérése az inventory alapján
   */
  const fetchItems = async (state = currentCharacterState) => {
    try {
      if (!state.inventory.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Lekérjük az összes tárgy adatát
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .in('id', state.inventory);

      if (error) throw error;

      // Számoljuk meg az egyes tárgyak darabszámát
      const itemCounts = state.inventory.reduce((acc: { [key: string]: number }, itemId) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
      }, {});

      // Különválasztjuk a storage és nem-storage tárgyakat
      const storageItems = data.filter((item: Item) => item.type.toLowerCase() === 'storage');
      const nonStorageItems = data.filter((item: Item) => item.type.toLowerCase() !== 'storage');

      // Készítsük el a nem-storage tárgyakat InventoryDisplayItem-ként
      const nonStorageDisplayItems: InventoryDisplayItem[] = nonStorageItems.map((item: Item) => ({
        ...item,
        count: itemCounts[item.id] || 0,
        equipped: state.equipped_items?.[item.type.toLowerCase() as keyof typeof state.equipped_items] === item.id,
        unique_key: `${item.id}-non-storage`, // Egyedi kulcs létrehozása a típus alapján
      })).filter(item => item.count > 0);

      // Készítsük el a storage tárgyakat InventoryDisplayItem-ként
      const storageDisplayItems: InventoryDisplayItem[] = storageItems.map((item: Item) => ({
        ...item,
        count: itemCounts[item.id] || 0,
        equipped: state.equipped_items?.[item.type.toLowerCase() as keyof typeof state.equipped_items] === item.id,
        unique_key: `${item.id}-storage`, // Egyedi kulcs létrehozása a típus alapján
        contents_count: 0, // Kezdetben feltöltjük, majd frissítjük
      }));

      // Lekérjük a storage tárgyak tartalmát a karakter_id alapján
      const storageIdsList = storageItems.map(item => item.id);
      const storageContents = await getStorageContents(storageIdsList, state.id); // getStorageContents most már több storage_item_id-t is kezel

      // Számoljuk meg a storage tartalmait per storage_item_id
      const storageContentMap: { [key: string]: number } = {};
      storageContents.forEach((content: any) => {
        if (storageContentMap[content.storage_item_id]) {
          storageContentMap[content.storage_item_id] += content.quantity;
        } else {
          storageContentMap[content.storage_item_id] = content.quantity;
        }
      });

      // Frissítsük a storage tárgyak tartalmát
      const updatedStorageItems = storageDisplayItems.map((item) => ({
        ...item,
        contents_count: storageContentMap[item.id] || 0,
      }));

      // Összekeverjük a storage és nem-storage tárgyakat
      const allItems = [...nonStorageDisplayItems, ...updatedStorageItems];
      setItems(allItems);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Adatok betöltése a komponens inicializálásakor
   */
  useEffect(() => {
    const loadData = async () => {
      const state = await fetchCharacterState();
      if (state) {
        await fetchItems(state);
        await calculateAndUpdateCombatStats(state); // Kezdeti kalkuláció
      }
    };
    loadData();
  }, [characterState]);

  /**
   * Tárgy felszerelése vagy levétele
   */
  const toggleEquip = async (item: InventoryDisplayItem) => { // Frissítve InventoryDisplayItem típusra
    if (!item.wearable) {
      setError('Ez a tárgy nem viselhető.');
      return;
    }

    try {
      setLoading(true);
      const state = await fetchCharacterState();
      if (!state) return;

      const slotName = item.type.toLowerCase() as keyof typeof state.equipped_items;
      const newEquippedItems: CharacterState['equipped_items'] = { ...state.equipped_items };

      if (item.equipped) {
        // Ha már fel van szerelve, levesszük
        newEquippedItems[slotName] = undefined;
      } else {
        // Ha nincs felszerelve, felszereljük (automatikusan lecserélve a régit)
        newEquippedItems[slotName] = item.id;
      }

      const { error: updateError } = await supabase
        .from('character_states')
        .update({ equipped_items: newEquippedItems })
        .eq('id', state.id);

      if (updateError) throw updateError;

      const updatedState = await fetchCharacterState();
      if (updatedState) {
        await fetchItems(updatedState);
        await calculateAndUpdateCombatStats(updatedState); // Combat statok frissítése
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tárgy törlése az inventoryból
   */
  const deleteItem = async (item: InventoryDisplayItem) => { // Frissítve InventoryDisplayItem típusra
    try {
      setLoading(true);
      const state = await fetchCharacterState();
      if (!state) return;

      let newInventory = [...state.inventory];

      if (item.type.toLowerCase() === 'storage') {
        if (item.count > 1) {
          // Ha több storage tárgy van, csökkentjük a count-ot és eltávolítunk egy példányt
          const index = newInventory.lastIndexOf(item.id);
          if (index === -1) {
            throw new Error('A tárgy nem található az inventory-ban');
          }
          newInventory.splice(index, 1);
        } else {
          // Ha csak egy storage tárgy van, töröljük a tartalmát és az inventoryból
          const { error: deleteContentsError } = await supabase
            .from('storage_contents')
            .delete()
            .eq('storage_item_id', item.id)
            .eq('character_id', state.id); // Add character_id filter

          if (deleteContentsError) throw deleteContentsError;

          // Töröljük a storage tárgyat az inventoryból
          newInventory = newInventory.filter((invItem: string) => invItem !== item.id);
        }
      } else {
        // Ha más tárgyat törlünk
        if (item.count > 1) {
          // Stackelhető tárgyaknál csökkentjük a count-ot
          const index = newInventory.lastIndexOf(item.id);
          if (index === -1) {
            throw new Error('A tárgy nem található az inventory-ban');
          }
          newInventory.splice(index, 1);
        } else {
          // Egyedi tárgyaknál töröljük az előfordulást
          const index = newInventory.indexOf(item.id);
          if (index === -1) {
            throw new Error('A tárgy nem található az inventory-ban');
          }
          newInventory.splice(index, 1);
        }
      }

      // Ha a törölt tárgy felszerelve volt, levesszük a felszerelt helyről
      const newEquippedItems = { ...state.equipped_items };
      const slotName = item.type.toLowerCase() as keyof typeof state.equipped_items;

      if (item.type.toLowerCase() !== 'storage' && newEquippedItems[slotName] === item.id) {
        newEquippedItems[slotName] = undefined;
      }

      const { error: updateError } = await supabase
        .from('character_states')
        .update({
          inventory: newInventory,
          equipped_items: newEquippedItems,
        })
        .eq('id', state.id);

      if (updateError) throw updateError;

      const updatedState = await fetchCharacterState();
      if (updatedState) {
        await fetchItems(updatedState);
        await calculateAndUpdateCombatStats(updatedState); // Combat statok frissítése
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Összsúly számítása
   */
  const calculateTotalWeight = () => {
    return items.reduce((total, item) => {
      if (item.type.toLowerCase() === 'storage') {
        // Ha storage tárgy, hozzáadjuk a tartalom súlyát is
        const storageWeight = item.weight * (item.count || 1);
        const contentsWeight = (item.contents_count || 0) * 0.5; // Példa: minden tartalom 0.5 kg
        return total + storageWeight + contentsWeight;
      }
      return total + (item.weight * (item.count || 1));
    }, 0);
  };

  /**
   * Összes tároló kapacitás számítása
   */
  const calculateTotalStorageCapacity = (): number => {
    return items
      .filter((item) => item.type.toLowerCase() === 'storage')
      .reduce((acc, item) => acc + ((item.capacity || 0) * (item.count || 1)), 0);
  };

  /**
   * Összes foglalt tárolás számítása
   */
  const calculateTotalStorageUsed = (): number => {
    // Összegyűjtjük a foglalt kapacitást minden storage tárgyra
    return items
      .filter((item) => item.type.toLowerCase() === 'storage')
      .reduce((acc, item) => acc + (item.contents_count || 0), 0);
  };

  const usedSlots = currentCharacterState.inventory.length;
  const remainingSlots = MAX_INVENTORY_SLOTS - usedSlots;
  const totalWeight = calculateTotalWeight();
  const totalStorageCapacity = calculateTotalStorageCapacity();
  const totalStorageUsed = calculateTotalStorageUsed();

  if (loading) {
    return <div className="text-white text-center">Betöltés...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-3 rounded-lg">
        <div className="flex justify-between text-white text-sm">
          <span>
            Helyek: {usedSlots}/{MAX_INVENTORY_SLOTS}
          </span>
          <span>Szabad: {remainingSlots}</span>
        </div>
        <div className="text-white text-sm mt-1">
          Összsúly: {totalWeight.toFixed(1)} kg
        </div>
        {/* Combat statok megjelenítése */}
        <div className="text-white text-sm mt-1">
          Támadás: {currentCharacterState.total_attack}, Védelem: {currentCharacterState.total_defense}
        </div>
        {/* Tároló kapacitás és foglalt mennyiség megjelenítése */}
        <div className="text-white text-sm mt-1">
          Tároló Kapacitás: {totalStorageUsed} / {totalStorageCapacity} egység
        </div>
      </div>

      {error && (
        <div className="bg-red-900 text-white p-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-sm underline hover:no-underline"
          >
            Bezárás
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-400 text-center">Az inventory üres</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.unique_key} // Használjuk a unique_key-t kulcsként
              className={`flex items-center gap-4 ${
                item.equipped ? 'bg-blue-900' : 'bg-gray-700'
              } p-3 rounded-lg`}
            >
              <div className="relative">
                <img
                  src={item.image_url || 'https://via.placeholder.com/40'}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                {/* Badge a stackelt tárgyak számának megjelenítéséhez */}
                {item.count > 1 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.count}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">{item.name}</h4>
                <p className="text-gray-400 text-sm">{item.type}</p>
                {/* Tároló tárgyak esetén megjelenítjük a tárolt mennyiséget és a kapacitást */}
                {item.type.toLowerCase() === 'storage' && (
                  <div className="text-gray-300 text-xs mt-1">
                    Tárolt: {item.contents_count} / {item.capacity ? item.capacity * (item.count || 1) : 0} egység
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.wearable && (
                  <button
                    onClick={() => toggleEquip(item)}
                    className={`p-2 rounded-lg ${
                      item.equipped
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    title={item.equipped ? 'Levenni' : 'Felvenni'}
                    disabled={loading}
                  >
                    <ShieldQuestion className="w-5 h-5 text-white" />
                  </button>
                )}
                {item.isUsable && ( // Ellenőrzés, hogy a tárgy használható-e
                  <button
                    onClick={() => setUsedItemId(item.id)} // Beállítjuk a használt tárgy ID-ját
                    className="p-2 bg-green-500 hover:bg-green-600 rounded-lg"
                    title="Használom"
                    disabled={loading}
                  >
                    <Zap className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  onClick={() => deleteItem(item)}
                  className="p-2 bg-red-500 hover:bg-red-600 rounded-lg"
                  title="Eldobás"
                  disabled={loading}
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        disabled={loading}
      >
        Bezárás
      </button>

      {/* UseItem komponens megjelenítése, ha van használt tárgy */}
      {usedItemId && (
        <UseItem
          itemId={usedItemId}
          characterState={currentCharacterState} // Átadjuk a karakter állapotát
          onClose={async () => { 
            setUsedItemId(null);
            const state = await fetchCharacterState();
            if (state) {
              await fetchItems(state);
              await calculateAndUpdateCombatStats(state); // Combat statok frissítése
            }
          }}
        />
      )}
    </div>
  );
};

export default InventoryUtil;
