// src/components/Gathering.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Item, CharacterSkillEntry, CharacterData, GatheringData } from './types/interface';
import * as Icons from 'lucide-react';

interface GatheringProps {
  terrainId: string;
  characterId: string; // character_state_id, uuid
  onClose: () => void;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  message: string;
  type: NotificationType;
}

const Gathering: React.FC<GatheringProps> = ({ terrainId, characterId, onClose }) => {
  const [gatherableItems, setGatherableItems] = useState<GatheringData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  // State for gathering mechanics
  const [isGathering, setIsGathering] = useState<boolean>(false);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [possibleItems, setPossibleItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [addingToInventory, setAddingToInventory] = useState<boolean>(false);

  // New state variables for skill level and dexterity modifier
  const [gatheringSkillLevel, setGatheringSkillLevel] = useState<number>(0);
  const [dexModifier, setDexModifier] = useState<number>(0);

  useEffect(() => {
    console.log('Fetching gatherable items for characterId:', characterId); // Debugging

    if (!characterId) {
      setError('Character ID is undefined.');
      setNotification({
        message: 'Character ID is undefined.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    const fetchGatherableItems = async () => {
      try {
        // 1. Ellenőrizzük és hozzáadjuk a "Gyűjtögetés" skill-t, ha szükséges
        await ensureGatheringSkill(characterId);

        // 2. Lekérjük a gathering_lists rekordokat a megadott terrainId alapján
        const { data: gatheringLists, error: listsError } = await supabase
          .from('gathering_lists')
          .select('id')
          .eq('terrain_id', terrainId);

        if (listsError) {
          throw listsError;
        }

        const gatheringListIds = gatheringLists.map(list => list.id);

        if (gatheringListIds.length === 0) {
          // Nincs gyűjthető tárgy ezen a terepen
          setGatherableItems([]);
          return;
        }

        // 3. Lekérjük a gatherings rekordokat a gathering_list_id-k alapján, és kapcsoljuk az items adatokat
        const { data: gatherings, error: gatheringsError } = await supabase
          .from('gatherings')
          .select(`
            item:items (
              id,
              name,
              description,
              image_url
            ),
            interval_start,
            interval_end
          `)
          .in('gathering_list_id', gatheringListIds);

        if (gatheringsError) {
          throw gatheringsError;
        }

        // 4. Kiválasztjuk a gatherings adatokat
        const validGatherings = gatherings.filter((gathering): gathering is GatheringData & { item: Item } => 
          gathering.item !== null && gathering.item !== undefined
        );

        setGatherableItems(validGatherings);
      } catch (err: any) {
        setError('Hiba a gyűjthető tárgyak lekérésekor.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGatherableItems();
  }, [terrainId, characterId]);

  // Automatikus gyűjtögetés indítása, miután a gatherableItems betöltődtek
  useEffect(() => {
    if (!loading && !error && gatherableItems.length > 0) {
      handleGather();
    }
    // Csak egyszer indítjuk el, amikor a gatherableItems betöltődnek
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, gatherableItems]);

  // Segédfüggvény a "Gyűjtögetés" skill ellenőrzésére és hozzáadására
  const ensureGatheringSkill = async (characterId: string) => {
    try {
      console.log('Ensuring gathering skill for characterId:', characterId); // Debugging

      // 1. Lekérjük a "Gyűjtögetés" skill id-ját
      let gatheringSkillId: number | null = null;

      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .select('id')
        .eq('name', 'Gyűjtögetés')
        .single();

      if (skillError) {
        if (skillError.code === 'PGRST116') { // Ha nem található a skill
          // 1.a. Automatikusan létrehozzuk a "Gyűjtögetés" skill-t
          const { data: newSkill, error: insertSkillError } = await supabase
            .from('skills')
            .insert([
              { 
                name: 'Gyűjtögetés', 
                description: 'Leírás a Gyűjtögetés skillhez.', 
                classes: [], // Adj meg megfelelő osztályokat, ha releváns
                attribute: 'Ügyesség' // Győződj meg róla, hogy ez az érték helyes
              }
            ])
            .select('id')
            .single();

          if (insertSkillError || !newSkill) {
            throw new Error('Nem sikerült létrehozni a "Gyűjtögetés" skill-t.');
          }

          gatheringSkillId = newSkill.id;

          // 1.b. Értesítést küldünk a felhasználónak a skill létrehozásáról
          setNotification({
            message: '"Gyűjtögetés" skill létrehozva.',
            type: 'info',
          });
        } else {
          throw skillError;
        }
      } else {
        gatheringSkillId = skillData.id;
      }

      if (gatheringSkillId === null) {
        throw new Error('Gyűjtögetés skill ID-ja nem áll rendelkezésre.');
      }

      // 2. Lekérjük a character_states rekordját, beleértve a skills mezőt
      const { data: characterState, error: characterStateError } = await supabase
        .from('character_states')
        .select('skills')
        .eq('id', characterId)
        .single();

      if (characterStateError) {
        throw characterStateError;
      }

      if (!characterState) {
        throw new Error('Character state not found.');
      }

      const currentSkills: CharacterSkillEntry[] = characterState.skills;

      // 3. Ellenőrizzük, hogy a "Gyűjtögetés" skill már jelen van-e
      const hasGatheringSkill = currentSkills.some(skill => skill.skill_id === gatheringSkillId);

      if (!hasGatheringSkill) {
        // 4. Hozzáadjuk a "Gyűjtögetés" skill-t a skills mezőhöz
        const updatedSkills: CharacterSkillEntry[] = [
          ...currentSkills,
          { skill_id: gatheringSkillId, skill_level: 1 }
        ];

        // 5. Frissítjük a character_states rekordját
        const { error: updateError } = await supabase
          .from('character_states')
          .update({ skills: updatedSkills })
          .eq('id', characterId);

        if (updateError) {
          throw updateError;
        }

        console.log('"Gyűjtögetés" skill hozzáadva a karakterhez.');

        // 6. Beállítjuk a sikerüzenetet
        setNotification({
          message: '"Gyűjtögetés" skill hozzáadva a karakteredhez.',
          type: 'success',
        });
      } else {
        console.log('A karakter már rendelkezik a "Gyűjtögetés" skill-el.');
        // 4.a. Értesítést küldünk a felhasználónak, hogy a skill már létezik
        //setNotification({
        // message: 'Már rendelkezel a "Gyűjtögetés" skill-el.',
        // type: 'info',
        //});
      }
    } catch (err: any) {
      setError('Hiba a "Gyűjtögetés" skill ellenőrzésekor vagy hozzáadásakor.');
      console.error(err);
      // Ha hiba történt a skill hozzáadása során, beállítunk egy hibaüzenetet
      setNotification({
        message: 'Hiba a "Gyűjtögetés" skill hozzáadása során.',
        type: 'error',
      });
    }
  };

  // Opció: Az üzenet eltűnésének kezelése (pl. automatikus bezárás után 5 másodperc)
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000); // 5 másodperc után eltűnik

      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper function to get dexterity modifier
  const getDexterityModifier = (attributes: Record<string, number>): number => {
    const dexterity = attributes['Ügyesség'] || 10; // Alapérték 10
    return Math.floor((dexterity - 10) / 2);
  };

  // Function to handle the gathering process
  const handleGather = async () => {
    setIsGathering(true);
    setError(null);
    setNotification(null);
    setRollResult(null);
    setTotal(null);
    setPossibleItems([]);
    setSelectedItem(null);

    try {
      // 1. Dobunk egy számot 1-20 között
      const roll = Math.floor(Math.random() * 20) + 1;
      setRollResult(roll);

      // 2. Lekérjük a karakter állapotát, beleértve a skills és attributes mezőket
      const { data: characterState, error: charStateError } = await supabase
        .from('character_states')
        .select(`
          skills,
          characters (
            attributes
          )
        `)
        .eq('id', characterId)
        .single();

      if (charStateError || !characterState) {
        throw charStateError || new Error('Karakter állapotát nem sikerült lekérni.');
      }

      // 3. Meghatározzuk a gyűjtögetés skill szintjét és az ügyesség módosítót
      const { data: skillData, error: skillFetchError } = await supabase
        .from('skills')
        .select('id')
        .eq('name', 'Gyűjtögetés')
        .single();

      if (skillFetchError || !skillData) {
        throw new Error('Gyűjtögetés skill adatainak lekérése sikertelen.');
      }

      const gatheringSkillId = skillData.id;

      const actualSkillEntry = characterState.skills.find(skill => skill.skill_id === gatheringSkillId);
      const gatheringSkillLevelValue = actualSkillEntry ? actualSkillEntry.skill_level : 0;
      setGatheringSkillLevel(gatheringSkillLevelValue);

      // 4. Meghatározzuk az ügyesség módosítóját
      const attributes = (characterState.characters as CharacterData)?.attributes || {};
      const dexModifierValue = getDexterityModifier(attributes);
      setDexModifier(dexModifierValue);

      // 5. Kiszámoljuk az összesített értéket
      let totalValue = roll + gatheringSkillLevelValue + dexModifierValue;
      if (totalValue > 20) totalValue = 20;
      setTotal(totalValue);

      // 6. Kiválasztjuk a lehető tárgyakat az intervallum alapján
      if (gatherableItems.length === 0) {
        setNotification({
          message: 'Nincs gyűjthető tárgy ezen a területen.',
          type: 'info',
        });
        setIsGathering(false);
        return;
      }

      // Szűrés a totalValue alapján: minden olyan tárgy, ami elérhető a totalValue-ig bezárólag
      const filteredGatherings = gatherableItems.filter(gathering => 
        gathering.interval_start <= totalValue
      );

      if (filteredGatherings.length === 0) {
        setNotification({
          message: 'A dobásod alapján nem gyűjthetsz tárgyat ezen a területen.',
          type: 'info',
        });
        setIsGathering(false);
        return;
      }

      // Leképezés az items-re
      const itemsToShow = filteredGatherings.map(gathering => gathering.item);
      setPossibleItems(itemsToShow);
    } catch (err: any) {
      setError('Hiba a gyűjtögetés során.');
      console.error(err);
    } finally {
      setIsGathering(false);
    }
  };

  // Function to add the selected item to inventory
  const handleAddToInventory = async () => {
    if (!selectedItem) return;

    setAddingToInventory(true);
    setError(null);
    setNotification(null);

    try {
      // Feltételezzük, hogy az inventory egy tömb stringekből, melyek az item ID-kat tartalmazzák
      const { data: characterState, error: charStateError } = await supabase
        .from('character_states')
        .select('inventory, maxInventorySize')
        .eq('id', characterId)
        .single();

      if (charStateError || !characterState) {
        throw charStateError || new Error('Karakter állapotát nem sikerült lekérni.');
      }

      let currentInventory: string[] = characterState.inventory || [];
      const maxInventory = characterState.maxInventorySize;

      if (currentInventory.length >= maxInventory) {
        setError('Az inventory tele van.');
        return;
      }

      // Hozzáadjuk az új itemot
      currentInventory.push(selectedItem.id);

      // Frissítjük az adatbázist
      const { error: updateError } = await supabase
        .from('character_states')
        .update({ inventory: currentInventory })
        .eq('id', characterId);

      if (updateError) {
        throw updateError;
      }

      setNotification({
        message: `${selectedItem.name} hozzáadva az inventory-hoz.`,
        type: 'success',
      });

      // Eltávolítjuk a kiválasztott tárgyat a lehetséges tárgyak listájából
      setPossibleItems(prevItems => prevItems.filter(item => item.id !== selectedItem.id));
      setSelectedItem(null);

      // Automatikusan bezárjuk a gyűjtögetés ablakot
      onClose();
    } catch (err: any) {
      setError('Hiba a tárgy inventory-hoz adása során.');
      console.error(err);
    } finally {
      setAddingToInventory(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 max-h-full overflow-auto relative">
        {/* Értesítés megjelenítése */}
        {notification && (
          <div
            className={`absolute top-0 left-0 right-0 p-4 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            } rounded-t-lg flex justify-between items-center text-center`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 text-lg font-bold">
              ×
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-4 mt-4">
          <h3 className="text-white text-xl font-bold">Gyűjtögetés</h3>
          <button onClick={onClose} className="text-red-500 hover:text-red-400">
            <Icons.X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-white">Betöltés...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : gatherableItems.length === 0 ? (
          <div className="text-white">Nincs gyűjthető tárgy ezen a területen.</div>
        ) : (
          <>
            {/* Gomb eltávolítva, automatikus gyűjtögetés */}
            {rollResult === null && isGathering ? (
              <div className="text-white">Gyűjtögetés folyamatban...</div>
            ) : (
              <>
                {rollResult !== null && (
                  <div className="mb-4 text-white">
                    <p><strong>Dobás eredménye:</strong> {rollResult}</p>
                    <p><strong>Gyűjtögetés Skill Szintje:</strong> {gatheringSkillLevel}</p>
                    <p><strong>Ügyesség Módosító:</strong> {dexModifier}</p>
                    <p><strong>Összesített Érték:</strong> {total}</p>
                  </div>
                )}

                {possibleItems.length > 0 ? (
                  <div>
                    <p className="text-white mb-2">Válassz egy tárgyat a következő listából (nem kötelező):</p>
                    <ul className="space-y-4 max-h-60 overflow-y-auto">
                      {possibleItems.map(item => (
                        <li key={item.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                          <div className="flex items-center">
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name} className="w-10 h-10 mr-4 rounded" />
                            )}
                            <div>
                              <p className="text-white font-semibold">{item.name}</p>
                              <p className="text-gray-300 text-sm">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="selectedItem"
                              value={item.id}
                              checked={selectedItem?.id === item.id}
                              onChange={() => setSelectedItem(item)}
                              className="mr-2"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleAddToInventory}
                      className={`mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full ${addingToInventory ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      disabled={addingToInventory || !selectedItem}
                    >
                      {addingToInventory ? 'Hozzáadása...' : 'Hozzáad az Inventory-hoz'}
                    </button>
                  </div>
                ) : (
                  <div className="text-white">A dobásod alapján nem található gyűjthető tárgy.</div>
                )}
              </>
            )}
          </>
        )}
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full"
        >
          Bezár
        </button>
      </div>
    </div>
  );
};

export default Gathering;
