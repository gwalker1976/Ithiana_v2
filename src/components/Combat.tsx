// src/components/Combat.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import CombatLog from './combat/CombatLog';
import CombatStats from './combat/CombatStats';
import CombatControls from './combat/CombatControls';
import {
  rollDice,
  calculateMonsterAttack,
  calculateBonus,
  getTotalDamageValue,
} from './utils/combatUtils';
import type { CharacterData, Monster, Ability, CharacterState, Item, DefenseBuff, AttackBuff, LootItem, Cash } from './types/interface';

interface CombatProps {
  characterState: CharacterState;
  monster: Monster;
  onEscape: () => void;
}

// Definiáljuk a CombatMessage típust
interface CombatMessage {
  type: 'damage' | 'heal' | 'info';
  message: string;
}

const Combat: React.FC<CombatProps> = ({ characterState, monster, onEscape }) => {
  // Állapotok
  const [currentCharacterState, setCurrentCharacterState] = useState<CharacterState>(characterState);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>({});
  const [combatLog, setCombatLog] = useState<CombatMessage[]>([]); // Frissített állapot
  const [monsterHealth, setMonsterHealth] = useState<number>(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [initiativeRolled, setInitiativeRolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Felszerelt tárgyak
  const [equippedItems, setEquippedItems] = useState<Record<string, Item>>({});

  // Loot kezeléséhez szükséges állapotok
  const [showLootPopup, setShowLootPopup] = useState(false);
  const [lootItems, setLootItems] = useState<LootItem[]>([]); // Módosítva LootItem[] típusra

  // Pénz (Cash) dobása a szörny által
  const [droppedCash, setDroppedCash] = useState<Cash | null>(null); // Új állapot a pénzhez

  // Loot előnézet állapota
  const [showLootPreview, setShowLootPreview] = useState(true);

  // Új állapot a körök számolásához
  const [turnCounter, setTurnCounter] = useState(0);

  // Új állapot az aktív védekezési buffokhoz
  const [activeDefenseBuffs, setActiveDefenseBuffs] = useState<DefenseBuff[]>([]);

  // Új állapot az aktív támadási buffokhoz
  const [activeAttackBuffs, setActiveAttackBuffs] = useState<AttackBuff[]>([]);

  /**
   * Harci naplóhoz üzenet hozzáadása
   */
  const addToCombatLog = (type: 'damage' | 'heal' | 'info', message: string) => {
    setCombatLog((prev) => [...prev, { type, message }]);
  };

  /**
   * Felszerelt fegyver lekérése
   */
  const getEquippedWeapon = (): Item | undefined => {
    return equippedItems.weapon;
  };

  /**
   * Karakter állapotának lekérése
   */
  const fetchCharacterState = async () => {
    try {
      const { data, error } = await supabase
        .from('character_states')
        .select('*')
        .eq('id', characterState.id)
        .single();

      if (error) {
        console.error('Error fetching character state:', error);
        return null;
      }

      setCurrentCharacterState(data);
      return data;
    } catch (err) {
      console.error('Error fetching character state:', err);
      return null;
    }
  };

  /**
   * Felszerelt tárgyak lekérése
   */
  const fetchEquippedItems = async (state: CharacterState) => {
    if (!state.equipped_items) {
      setEquippedItems({});
      return;
    }

    const itemIds = Object.values(state.equipped_items).filter((id) => id);

    if (itemIds.length === 0) {
      setEquippedItems({});
      return;
    }

    const { data, error } = await supabase.from('items').select('*').in('id', itemIds);

    if (error) {
      console.error('Error fetching equipped items:', error);
      return;
    }

    const itemsMap: Record<string, Item> = {};
    data.forEach((item) => {
      Object.entries(state.equipped_items || {}).forEach(([slot, id]) => {
        if (id === item.id) {
          itemsMap[slot] = item;
        }
      });
    });

    setEquippedItems(itemsMap);
  };

  /**
   * Karakter és képességek lekérése
   */
  const fetchCharacterAndAbilities = async () => {
    try {
      const state = await fetchCharacterState();
      if (!state) return;

      // Karakteradatok lekérése
      const { data: charData, error: charError } = await supabase
        .from('characters')
        .select('id, name, species, class, attributes, profile_image_url, profile_id, skills')
        .eq('id', state.character_id)
        .single();

      if (charError) throw charError;

      const characterWithLevel: CharacterData & { level: number } = {
        ...charData,
        level: state.level || 1,
      };

      setCharacter(characterWithLevel);

      // Osztály képességek lekérése
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('abilities')
        .eq('name', characterWithLevel.class)
        .single();

      if (classError) throw classError;

      if (classData?.abilities?.length > 0) {
        const availableAbilities = classData.abilities.filter(
          (ability: { name: string; level: number }) => ability.level <= characterWithLevel.level
        );

        if (availableAbilities.length > 0) {
          const { data: abilitiesData, error: abilitiesError } = await supabase
            .from('class_abilities')
            .select('*')
            .in(
              'name',
              availableAbilities.map((a) => a.name)
            );

          if (abilitiesError) throw abilitiesError;

          setAbilities(abilitiesData || []);

          const initialCooldowns: Record<string, number> = {};
          abilitiesData?.forEach((ability) => {
            initialCooldowns[ability.id] = 0;
          });
          setAbilityCooldowns(initialCooldowns);
        }
      }

      // Felszerelt tárgyak lekérése
      await fetchEquippedItems(state);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching character or abilities:', error);
      setLoading(false);
    }
  };

  /**
   * Komponens inicializálása
   */
  useEffect(() => {
    fetchCharacterAndAbilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterState]);

  /**
   * Real-time frissítések kezelése
   */
  useEffect(() => {
    const subscription = supabase
      .channel(`character_state_${characterState.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'character_states',
          filter: `id=eq.${characterState.id}`,
        },
        async (payload) => {
          console.log('Character state updated:', payload.new);
          setCurrentCharacterState(payload.new);
          await fetchEquippedItems(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [characterState.id]);

  /**
   * Szörny egészség inicializálása
   */
  useEffect(() => {
    const calculateMonsterHp = () => {
      let total = 0;
      const diceType = parseInt(monster.health.type.slice(1), 10);

      for (let i = 0; i < monster.health.count; i++) {
        const roll = Math.floor(Math.random() * diceType) + 1;
        addToCombatLog('info', `HP dobás ${i + 1}: ${roll}`);
        total += roll;
      }

      total += monster.health.modifier;
      setMonsterHealth(total);
      addToCombatLog('info', `${monster.name} teljes HP: ${total}`);
    };

    calculateMonsterHp();
  }, [monster]);

  /**
   * Buffok összegzésére szolgáló useMemo
   */
  const totalAttackBuff = useMemo(() => {
    return activeAttackBuffs.reduce((acc, buff) => acc + buff.attackAmount, 0);
  }, [activeAttackBuffs]);

  const totalDefenseBuff = useMemo(() => {
    return activeDefenseBuffs.reduce((acc, buff) => acc + buff.defenseAmount, 0);
  }, [activeDefenseBuffs]);

  /**
   * Teljesített támadás és védelem számítása
   */
  const totalAttackComputed = useMemo(() => {
    return (currentCharacterState.total_attack || 0) + totalAttackBuff;
  }, [currentCharacterState.total_attack, totalAttackBuff]);

  const totalDefenseComputed = useMemo(() => {
    return (currentCharacterState.total_defense || 0) + totalDefenseBuff;
  }, [currentCharacterState.total_defense, totalDefenseBuff]);

  /**
   * Kezdeményezés dobása
   */
  const rollInitiative = () => {
    if (!character) return;

    const dexterityBonus = calculateBonus(character.attributes['Ügyesség']);
    const characterInitiative = rollDice(1, 'd6') + dexterityBonus;
    const monsterInitiative = rollDice(1, 'd6');

    addToCombatLog('info', `${character.name} kezdeményezése: ${characterInitiative}`);
    addToCombatLog('info', `${monster.name} kezdeményezése: ${monsterInitiative}`);

    const playerWinsInitiative = characterInitiative >= monsterInitiative;
    setIsPlayerTurn(playerWinsInitiative);
    setInitiativeRolled(true);

    if (playerWinsInitiative) {
      addToCombatLog('info', `${character.name} kezdi a harcot!`);
    } else {
      addToCombatLog('info', `${monster.name} kezdi a harcot!`);
      setIsPlayerTurn(false);
      setTimeout(monsterTurn, 1000);
    }
  };

  /**
   * Alap támadás
   */
  const basicAttack = async () => {
    if (!character || !isPlayerTurn) return;

    const weapon = getEquippedWeapon();
    const strength = character.attributes['Erő'];

    const attackBonus = totalAttackComputed;
    const attackRoll = rollDice(1, 'd6');
    const totalAttackRoll = attackRoll + attackBonus;

    addToCombatLog('info', `${character.name} támad!`);
    addToCombatLog('info', `Támadó dobás: ${attackRoll} + ${attackBonus} = ${totalAttackRoll}`);

    if (totalAttackRoll >= monster.defense) {
      let damage = 0;
      if (weapon?.damage) {
        const { count, type, modifier } = weapon.damage;
        damage = getTotalDamageValue(
          count,
          type,
          modifier,
          strength,
          weapon.attack || 0
        );
        addToCombatLog(
          'damage',
          `Fegyver: ${weapon.name} sebzés: ${count}${type} + ${modifier} + Erő bónusz (${calculateBonus(
            strength
          )}) = ${damage}`
        );
      } else {
        // Alap sebzés, ha nincs fegyver
        damage = getTotalDamageValue(1, 'd6', 0, strength);
        addToCombatLog(
          'damage',
          `Sebzés: 1d6 + Erő bónusz (${calculateBonus(strength)}) = ${damage}`
        );
      }

      const newMonsterHp = Math.max(0, monsterHealth - damage);
      setMonsterHealth(newMonsterHp);
      addToCombatLog('damage', `Találat! Sebzés: ${damage}`);

      if (newMonsterHp <= 0) {
        await handleMonsterDefeat();
        return;
      }
    } else {
      addToCombatLog('info', 'A támadás nem talált!');
    }

    setIsPlayerTurn(false);
    setTimeout(monsterTurn, 1000);
  };

  /**
   * Képesség használata
   */
  const useAbility = async (ability: Ability) => {
    if (!character || !isPlayerTurn || abilityCooldowns[ability.id] > 0) return;

    const weapon = getEquippedWeapon();
    const weaponAttackBonus = weapon?.attack || 0;

    const mainAttributeName = ability.mainAttribute as keyof typeof character.attributes;
    const mainAttributeValue = character.attributes[mainAttributeName];

    const { properties } = ability;

    if (ability.type === 'Védekezés') {
      const protectionType = properties.protectionType;
      const defenseAmount = properties.defenseAmount || 0;
      const duration = properties.duration || 0;

      const newBuff: DefenseBuff = {
        abilityId: ability.id,
        defenseAmount,
        remainingDuration: duration,
        abilityImageUrl: ability.profile_image_url,
      };

      setActiveDefenseBuffs((prevBuffs) => [...prevBuffs, newBuff]);

      addToCombatLog('info', `${character.name} használja: ${ability.name}`);
      addToCombatLog('info', `Védekezés típusa: ${protectionType}, Védelmi mérték: +${defenseAmount}, Időtartam: ${duration} kör`);

      setAbilityCooldowns((prev) => ({
        ...prev,
        [ability.id]: ability.cooldown,
      }));

      setIsPlayerTurn(false);
      setTimeout(monsterTurn, 1000);
      return;
    }

    if (ability.type === 'Erősítés') {
      const attackAmount = properties.attackAmount || 0;
      const duration = properties.duration || 0;

      const newAttackBuff: AttackBuff = {
        abilityId: ability.id,
        attackAmount,
        remainingDuration: duration,
        abilityImageUrl: ability.profile_image_url,
      };

      setActiveAttackBuffs((prevBuffs) => [...prevBuffs, newAttackBuff]);

      addToCombatLog('info', `${character.name} használja: ${ability.name}`);
      addToCombatLog('info', `Támadási erősítés: +${attackAmount}, Időtartam: ${duration} kör`);

      setAbilityCooldowns((prev) => ({
        ...prev,
        [ability.id]: ability.cooldown,
      }));

      setIsPlayerTurn(false);
      setTimeout(monsterTurn, 1000);
      return;
    }

    // Támadási képesség kezelése
    const damage = properties.damage;
    if (!damage) return;

    const diceResult = rollDice(damage.count, damage.type);
    const totalDamage =
      diceResult + damage.modifier + calculateBonus(mainAttributeValue) + weaponAttackBonus;

    addToCombatLog('info', `${character.name} használja: ${ability.name}`);
    addToCombatLog(
      'damage',
      `Sebzés: ${diceResult} + ${damage.modifier} + Fegyver bónusz (${weaponAttackBonus}) + ${mainAttributeName} bónusz (${calculateBonus(
        mainAttributeValue
      )}) = ${totalDamage}`
    );

    const newMonsterHp = Math.max(0, monsterHealth - totalDamage);
    setMonsterHealth(newMonsterHp);

    if (newMonsterHp <= 0) {
      await handleMonsterDefeat();
      return;
    }

    setAbilityCooldowns((prev) => ({
      ...prev,
      [ability.id]: ability.cooldown,
    }));

    setIsPlayerTurn(false);
    setTimeout(monsterTurn, 1000);
  };

  /**
   * Utility function to get a random integer between min and max (inclusive)
   */
  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  /**
   * Szörny legyőzése után loot és pénz kezelése
   */
  const handleMonsterDefeat = async () => {
    addToCombatLog('info', `${monster.name} legyőzve!`);

    // Loot meghatározása
    const droppedItems: { itemId: string; quantity: number }[] = [];

    if (monster.loot && Array.isArray(monster.loot)) {
      for (const lootEntry of monster.loot) {
        const chance = lootEntry.dropChance || 0;
        const roll = Math.random() * 100;
        if (roll <= chance) {
          const existingItem = droppedItems.find((item) => item.itemId === lootEntry.itemId);
          if (existingItem) {
            existingItem.quantity += 1;
          } else {
            droppedItems.push({ itemId: lootEntry.itemId, quantity: 1 });
          }
        }
      }
    }

    // Loot kezelése
    if (droppedItems.length > 0) {
      // Tárgyak lekérése az adatbázisból
      const { data: itemsData, error } = await supabase
        .from('items')
        .select('*')
        .in(
          'id',
          droppedItems.map((item) => item.itemId)
        );

      if (error) {
        console.error('Error fetching loot items:', error);
        setTimeout(onEscape, 1500);
        return;
      }

      // Hozzárendeljük a mennyiségeket az itemekhez
      const itemsWithQuantities: LootItem[] = itemsData.map((item) => {
        const droppedItem = droppedItems.find((di) => di.itemId === item.id);
        return {
          item,
          quantity: droppedItem?.quantity || 1,
        };
      }).filter(entry => entry.item !== undefined) as Array<{ item: Item; dropChance: number }>;

      setLootItems(itemsWithQuantities);
    }

    // Pénz generálása, ha a szörnynek vannak pénzérték mezői
    const { gold_min, gold_max, silver_min, silver_max, copper_min, copper_max } = monster;

    const gold = (gold_min !== undefined && gold_max !== undefined) ? getRandomInt(gold_min, gold_max) : 0;
    const silver = (silver_min !== undefined && silver_max !== undefined) ? getRandomInt(silver_min, silver_max) : 0;
    const copper = (copper_min !== undefined && copper_max !== undefined) ? getRandomInt(copper_min, copper_max) : 0;

    if (gold > 0 || silver > 0 || copper > 0) {
      setDroppedCash({ gold, silver, copper }); // Pénz tárolása az új állapotban
      addToCombatLog('info', `Szörny pénzt dobott: ${gold} arany, ${silver} ezüst, ${copper} réz.`);
    }

    // Megjelenítjük a LootPopup-ot, ha van loot vagy pénz
    if (
      (droppedCash && (droppedCash.gold > 0 || droppedCash.silver > 0 || droppedCash.copper > 0)) ||
      droppedItems.length > 0 ||
      (gold > 0 || silver > 0 || copper > 0)
    ) {
      setShowLootPopup(true);
    } else {
      // Nincs loot vagy pénz
      setTimeout(onEscape, 1500);
    }
  };

  /**
   * Loot kiválasztása és inventory frissítése
   */
  const handleLootSelection = async (selectedItems: LootItem[]) => {
    try {
      // Jelenlegi inventory lekérése
      const currentInventory = currentCharacterState.inventory || [];

      // Kiválasztott tárgyak ID-jainak listája és mennyiségei
      const selectedItemIds = selectedItems.flatMap((lootItem) => {
        return Array(lootItem.quantity).fill(lootItem.item.id);
      });

      // Új inventory összeállítása
      const newInventory = [...currentInventory, ...selectedItemIds];

      // Ellenőrizzük az inventory méretét
      if (newInventory.length > currentCharacterState.maxInventorySize) {
        addToCombatLog('info', 'Nincs elég hely az inventoryban a kiválasztott tárgyak számára.');
        console.warn('Nincs elég hely az inventoryban.');
        return;
      }

      // Inventory frissítése az adatbázisban
      const { error } = await supabase
        .from('character_states')
        .update({ inventory: newInventory })
        .eq('id', characterState.id);

      if (error) {
        console.error('Error updating inventory:', error);
        addToCombatLog('info', 'Hiba történt az inventory frissítésekor.');
      } else {
        addToCombatLog('info', 'A kiválasztott tárgyak hozzáadva az inventory-hoz.');
        // Lokális állapot frissítése
        setCurrentCharacterState((prevState) => ({
          ...prevState,
          inventory: newInventory,
        }));
      }

      // Pénz kezelése, ha van droppedCash vagy a szörny pénzt dobott
      if (droppedCash && (droppedCash.gold > 0 || droppedCash.silver > 0 || droppedCash.copper > 0)) {
        // Update character's cash
        const newCash: Cash = {
          gold: currentCharacterState.cash.gold + droppedCash.gold,
          silver: currentCharacterState.cash.silver + droppedCash.silver,
          copper: currentCharacterState.cash.copper + droppedCash.copper,
        };

        // Handle overflow: 100 copper = 1 silver, 100 silver = 1 gold
        let { gold: totalGold, silver: totalSilver, copper: totalCopper } = newCash;

        if (totalCopper >= 100) {
          totalSilver += Math.floor(totalCopper / 100);
          totalCopper = totalCopper % 100;
        }

        if (totalSilver >= 100) {
          totalGold += Math.floor(totalSilver / 100);
          totalSilver = totalSilver % 100;
        }

        const finalCash: Cash = {
          gold: totalGold,
          silver: totalSilver,
          copper: totalCopper,
        };

        // Inventory frissítése az adatbázisban
        const { error: cashError } = await supabase
          .from('character_states')
          .update({ cash: finalCash })
          .eq('id', characterState.id);

        if (cashError) {
          console.error('Error updating character cash:', cashError);
          addToCombatLog('info', 'Hiba történt a pénz frissítésekor.');
        } else {
          addToCombatLog('info', `Pénz hozzáadva: ${droppedCash.gold} arany, ${droppedCash.silver} ezüst, ${droppedCash.copper} réz.`);
          // Lokális állapot frissítése
          setCurrentCharacterState((prevState) => ({
            ...prevState,
            cash: finalCash,
          }));
        }
      }

    } catch (err) {
      console.error('Error in handleLootSelection:', err);
    }

    setShowLootPopup(false);
    setDroppedCash(null); // Reset the dropped cash
    setTimeout(onEscape, 1500);
  };

  /**
   * Szörny támadása
   */
  const monsterTurn = async () => {
    if (!character) return;

    const attackRoll = rollDice(1, 'd6');
    const monsterAttackBonus = calculateMonsterAttack(monster.attack, monster.difficulty);
    const totalAttackRoll = attackRoll + monsterAttackBonus;
    const characterDefense = totalDefenseComputed; // Használjuk a származtatott totalDefense értéket

    addToCombatLog('info', `${monster.name} támad!`);
    addToCombatLog('info', `Támadó dobás: ${attackRoll} + ${monsterAttackBonus} = ${totalAttackRoll}`);

    if (totalAttackRoll >= characterDefense) {
      const damage = getTotalDamageValue(
        monster.damage.count,
        monster.damage.type,
        monster.damage.modifier,
        character.attributes['Erő']
      );
      const newHealth = Math.max(0, currentCharacterState.current_health - damage);

      // Karakter állapot frissítése
      setCurrentCharacterState((prev) => ({
        ...prev,
        current_health: newHealth,
      }));

      try {
        const { error } = await supabase
          .from('character_states')
          .update({ current_health: newHealth })
          .eq('id', characterState.id);

        if (error) throw error;

        addToCombatLog('damage', `Találat! Sebzés: ${damage}`);

        if (newHealth <= 0) {
          addToCombatLog('info', `${character.name} legyőzve!`);
          setTimeout(onEscape, 1500);
          return;
        }
      } catch (error) {
        console.error('Error updating character health:', error);
        addToCombatLog('info', 'Hiba történt a karakter életének frissítésekor');
      }
    } else {
      addToCombatLog('info', 'A támadás nem talált!');
    }

    // Kör vége, növeljük a turnCounter értékét
    setTurnCounter((prev) => prev + 1);

    setIsPlayerTurn(true);
  };

  /**
   * Hűtési idők frissítése minden teljes körben és buffok időtartamának kezelése
   */
  useEffect(() => {
    if (turnCounter > 0) {
      // Képességek hűtési idejének frissítése
      setAbilityCooldowns((prev) => {
        const newCooldowns = { ...prev };
        Object.keys(newCooldowns).forEach((key) => {
          if (newCooldowns[key] > 0) {
            newCooldowns[key]--;
          }
        });
        return newCooldowns;
      });

      // Process defense buffs
      setActiveDefenseBuffs((prevBuffs) => {
        const updatedBuffs = [];
        const expiredBuffs: DefenseBuff[] = [];
        prevBuffs.forEach((buff) => {
          const newDuration = buff.remainingDuration - 1;
          if (newDuration > 0) {
            updatedBuffs.push({ ...buff, remainingDuration: newDuration });
          } else {
            expiredBuffs.push(buff);
          }
        });

        // Buffok lejártakor naplózzuk és a buffokat eltávolítjuk
        if (expiredBuffs.length > 0) {
          expiredBuffs.forEach(buff => {
            addToCombatLog('info', `Védekezési buff lejárt: +${buff.defenseAmount} Védelem`);
          });
        }

        return updatedBuffs;
      });

      // Process attack buffs
      setActiveAttackBuffs((prevBuffs) => {
        const updatedBuffs = [];
        const expiredBuffs: AttackBuff[] = [];
        prevBuffs.forEach((buff) => {
          const newDuration = buff.remainingDuration - 1;
          if (newDuration > 0) {
            updatedBuffs.push({ ...buff, remainingDuration: newDuration });
          } else {
            expiredBuffs.push(buff);
          }
        });

        // Buffok lejártakor naplózzuk és a buffokat eltávolítjuk
        if (expiredBuffs.length > 0) {
          expiredBuffs.forEach(buff => {
            addToCombatLog('info', `Támadási buff lejárt: +${buff.attackAmount} Támadás`);
          });
        }

        return updatedBuffs;
      });

      // Naplózás a buffok frissítéséről
      addToCombatLog(
        'info',
        `Buffok frissítve: Támadás: ${totalAttackComputed}, Védelem: ${totalDefenseComputed}`
      );
    }
    // Csak a turnCounter változására reagálunk
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnCounter]);

  /**
   * Buffok visszaállítása harc befejezésekor
   */
  useEffect(() => {
    return () => {
      // Reset buffokat
      setActiveDefenseBuffs([]);
      setActiveAttackBuffs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Buffok levonása és frissítése a turnCounter-n keresztül
   */
  useEffect(() => {
    if (turnCounter > 0) {
      // Buffok lejártakor a totalAttack és totalDefense automatikusan frissülnek a useMemo által
      // Így nem kell külön vonni az értékeket
      addToCombatLog(
        'info',
        `Buffok frissítve: Támadás: ${totalAttackComputed}, Védelem: ${totalDefenseComputed}`
      );
    }
  }, [turnCounter, totalAttackComputed, totalDefenseComputed]);

  /**
   * Buffok Box Módosítása: Lekerekített négyzetes formák és egységes betűméret
   */
  const renderBuffs = () => {
    return (
      <div className="bg-gray-700 p-4 rounded-lg shadow min-h-24">
        <div className="flex space-x-4 overflow-x-auto">
          {activeDefenseBuffs.length > 0 || activeAttackBuffs.length > 0 ? (
            <>
              {activeDefenseBuffs.map((buff) => (
                <div
                  key={`defense-${buff.abilityId}`}
                  className="flex items-center bg-gray-600 p-3 rounded-none shadow"
                >
                  <img
                    src={buff.abilityImageUrl || 'https://via.placeholder.com/50'}
                    alt="Buff Icon"
                    className="w-12 h-12 mr-3 object-cover"
                  />
                  <div>
                    <span className="text-white text-base font-medium">+{buff.defenseAmount} Védelem</span>
                    <span className="text-gray-300 text-base block">Hátra: {buff.remainingDuration} kör</span>
                  </div>
                </div>
              ))}
              {activeAttackBuffs.map((buff) => (
                <div
                  key={`attack-${buff.abilityId}`}
                  className="flex items-center bg-gray-600 p-3 rounded-none shadow"
                >
                  <img
                    src={buff.abilityImageUrl || 'https://via.placeholder.com/50'}
                    alt="Buff Icon"
                    className="w-12 h-12 mr-3 object-cover"
                  />
                  <div>
                    <span className="text-white text-base font-medium">+{buff.attackAmount} Támadás</span>
                    <span className="text-gray-300 text-base block">Hátra: {buff.remainingDuration} kör</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-gray-300">Nincsenek aktív buffok.</p>
          )}
        </div>
      </div>
    );
  };

  if (loading || !character) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col space-y-6">
        {/* Harci Statisztikák */}
        <CombatStats
          character={character}
          monster={monster}
          currentHealth={currentCharacterState.current_health}
          maxHealth={currentCharacterState.max_health}
          monsterHealth={monsterHealth}
          totalAttack={totalAttackComputed} // Használjuk az új számított értéket
          totalDefense={totalDefenseComputed} // Használjuk az új számított értéket
          weaponDamage={getEquippedWeapon()?.damage}
        />

        {/* Buffok Box */}
        {renderBuffs()}

        {/* Harci Napló */}
        <CombatLog messages={combatLog} />

        {/* Harci Irányítás */}
        {!showLootPreview && (
          <CombatControls
            initiativeRolled={initiativeRolled}
            isPlayerTurn={isPlayerTurn}
            abilities={abilities}
            abilityCooldowns={abilityCooldowns}
            onRollInitiative={rollInitiative}
            onBasicAttack={basicAttack}
            onUseAbility={useAbility}
            onEscape={onEscape}
          />
        )}
      </div>

      {/* Loot Előnézet */}
      {showLootPreview && (
        <LootPreview
          loot={monster.loot || []}
          onClose={() => setShowLootPreview(false)}
        />
      )}

      {/* Loot Popup */}
      {showLootPopup && (
        <LootPopup
          items={lootItems}
          droppedCash={droppedCash} // Új prop a pénzhez
          onConfirm={handleLootSelection} // handleLootSelection most LootItem[] és Cash | null vár
        />
      )}
    </div>
  );
};

/**
 * LootPreview komponens a harc előtti loot esélyek megjelenítéséhez
 */
interface LootPreviewProps {
  loot: Array<{
    itemId: string;
    dropChance: number;
  }>;
  onClose: () => void;
}

const LootPreview: React.FC<LootPreviewProps> = ({ loot, onClose }) => {
  const [lootItems, setLootItems] = useState<
    Array<{ item: Item; dropChance: number }>
  >([]);

  useEffect(() => {
    const fetchLootItems = async () => {
      const itemIds = loot.map((lootEntry) => lootEntry.itemId);

      const { data: itemsData, error } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds);

      if (error) {
        console.error('Error fetching loot items for preview:', error);
        return;
      }

      const itemsWithChances = loot.map((lootEntry) => {
        const item = itemsData.find((item) => item.id === lootEntry.itemId);
        return {
          item,
          dropChance: lootEntry.dropChance,
        };
      }).filter(entry => entry.item !== undefined) as Array<{ item: Item; dropChance: number }>;

      setLootItems(itemsWithChances);
    };

    fetchLootItems();
  }, [loot]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Lehetséges Zsákmány</h2>
        <ul className="space-y-4">
          {lootItems.map(({ item, dropChance }, index) => (
            <li key={`${item.id}-${index}`} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg shadow">
              <div className="flex items-center space-x-4">
                <img
                  src={item.image_url || 'https://via.placeholder.com/50'}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <span className="text-lg text-white">{item.name}</span>
              </div>
              <span className="text-lg text-gray-300">{dropChance}% esély</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg shadow transition"
        >
          Folytatás
        </button>
      </div>
    </div>
  );
};

/**
 * LootPopup komponens a loot megjelenítéséhez és kiválasztásához
 */
interface LootPopupProps {
  items: LootItem[]; // Módosítva LootItem[] típusra
  droppedCash: Cash | null; // Új prop a pénzhez
  onConfirm: (selectedItems: LootItem[]) => void; // onConfirm paraméter típusa LootItem[] és Cash | null
}

const LootPopup: React.FC<LootPopupProps> = ({ items, droppedCash, onConfirm }) => {
  const [selectedItems, setSelectedItems] = useState<LootItem[]>([]); // LootItem[] típus
  const [acceptCash, setAcceptCash] = useState<boolean>(false); // Új állapot a pénz elfogadásához

  const toggleItemSelection = (lootItem: LootItem) => {
    setSelectedItems((prevSelected) => {
      if (prevSelected.find((i) => i.item.id === lootItem.item.id)) {
        return prevSelected.filter((i) => i.item.id !== lootItem.item.id);
      } else {
        return [...prevSelected, lootItem];
      }
    });
  };

  const handleConfirm = () => {
    // Csak a kiválasztott tárgyakat és a pénzt fogadjuk el
    onConfirm(selectedItems);

    // Ha a pénzt is elfogadják, akkor azonnal hozzáadjuk a karakter cash-hez
    // Ez a logikát a handleLootSelection már kezeli
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6">
        <h2 className="text-2xl font-bold text-white">Zsákmány Kiválasztása</h2>

        {/* Pénz Zsákmány Doboz */}
        {droppedCash && (droppedCash.gold > 0 || droppedCash.silver > 0 || droppedCash.copper > 0) && (
          <div className="p-4 bg-gray-700 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-white mb-2">Pénz Zsákmány</h3>
            <div className="flex items-center space-x-4">
              {droppedCash.gold > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-300 font-bold">{droppedCash.gold}</span>
                  <span className="text-yellow-300">Arany</span>
                </div>
              )}
              {droppedCash.silver > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400 font-bold">{droppedCash.silver}</span>
                  <span className="text-gray-400">Ezüst</span>
                </div>
              )}
              {droppedCash.copper > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-500 font-bold">{droppedCash.copper}</span>
                  <span className="text-yellow-500">Réz</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={acceptCash}
                  onChange={() => setAcceptCash(!acceptCash)}
                  className="form-checkbox h-5 w-5 text-green-500"
                />
                <span className="ml-2">Elfogadom a pénzt</span>
              </label>
            </div>
          </div>
        )}

        {/* Tárgyak Zsákmánya Doboz */}
        {items.length > 0 && (
          <div className="p-4 bg-gray-700 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-white mb-2">Tárgyi Zsákmány</h3>
            <ul className="space-y-4">
              {items.map((lootItem) => (
                <li key={lootItem.item.id} className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.some((i) => i.item.id === lootItem.item.id)}
                    onChange={() => toggleItemSelection(lootItem)}
                    className="form-checkbox h-6 w-6 text-blue-600"
                  />
                  <div className="flex items-center space-x-4">
                    <img
                      src={lootItem.item.image_url || 'https://via.placeholder.com/50'}
                      alt={lootItem.item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <span className="text-lg text-white">{lootItem.item.name} x{lootItem.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ha nincs loot és pénz */}
        {items.length === 0 && !droppedCash && (
          <p className="text-gray-300">Nincsenek elérhető zsákmányok.</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={
            (items.length > 0 && selectedItems.length === 0) ||
            (droppedCash && !acceptCash)
          }
          className={`mt-6 w-full ${
            (items.length > 0 && selectedItems.length === 0) ||
            (droppedCash && !acceptCash)
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          } text-white py-2 px-4 rounded-lg shadow transition`}
        >
          Kiválasztás
        </button>
      </div>
    </div>
  );
};

export default Combat;
