// src/components/PlayGame.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { InventoryUtil } from './InventoryUtil';
import { CreateItem } from './CreateItem';
import { CharacterSheet } from './CharacterSheet';
import Combat from './Combat';
import Store from './Store';
import FatigueIndicator from './FatigueIndicator';
import Gathering from './Gathering';
import HungerIndicator from './indicators/HungerIndicator';
import ThirstIndicator from './indicators/ThirstIndicator';
import { PostgrestRealtimePayload } from '@supabase/supabase-js';
import { arrangeItemsInStorage } from './utils/inventoryArrangement'; // Logika a tárgyak storage-ba rakásához

import {
  TerrainType,
  Monster,
  CharacterData,
  CharacterState,
  MapTile,
  Event,
  EncounterList,
  Encounter
} from './types/interface';

import useTime from './utils/useTime';
import TimeDisplay from './TimeDisplay';

const PlayGame: React.FC = () => {
  const navigate = useNavigate();

  // Állapotok
  const [user, setUser] = useState<any>(null);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [characterState, setCharacterState] = useState<CharacterState | null>(null);
  const [terrainTypes, setTerrainTypes] = useState<TerrainType[]>([]);
  const [mapTiles, setMapTiles] = useState<Map<string, MapTile>>(new Map());
  const [notification, setNotification] = useState<string | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [currentCombat, setCurrentCombat] = useState<{ monster: Monster } | null>(null);
  const [currentStore, setCurrentStore] = useState<boolean>(false);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [currentDescription, setCurrentDescription] = useState<string | null>(null);

  // Encounterhez kapcsolódó állapotok
  const [encounterLists, setEncounterLists] = useState<EncounterList[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);

  const VIEWPORT_SIZE = 4;

  // Idő alapú csökkentések trackelése
  const [lastFatigueDecrement, setLastFatigueDecrement] = useState<number>(0);
  const [lastHungerDecrement, setLastHungerDecrement] = useState<number>(0);
  const [lastThirstDecrement, setLastThirstDecrement] = useState<number>(0);

  // Pihenés állapota
  const [isResting, setIsResting] = useState<boolean>(false);

  // Is_once események trackelése
  const [completedOnceEvents, setCompletedOnceEvents] = useState<Set<string>>(new Set());

  // useTime hook
  const { time, incrementTime, addTime } = useTime(selectedCharacter ? selectedCharacter.id : null);

  const [showGathering, setShowGathering] = useState<boolean>(false);

  // Inventory változások megfigyeléséhez
  const [previousInventory, setPreviousInventory] = useState<string[]>([]);

  // Felhasználó bejelentkezés ellenőrzés
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('Felhasználó autentikációs hibája vagy nincs bejelentkezve.');
        navigate('/');
        return;
      }
      console.log('Bejelentkezett felhasználó:', user);
      setUser(user);
    };

    fetchUser();
  }, [navigate]);

  // Karakterek lekérése
  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('profile_id', user.id);

      if (error) {
        console.error('Hiba a karakterek betöltésekor:', error);
        setNotification('Hiba a karakterek betöltésekor');
      } else {
        console.log('Lekért karakterek:', data);
        setCharacters(data || []);
      }
    };

    fetchCharacters();
  }, [user]);

  // Tereptípusok lekérése
  useEffect(() => {
    const fetchTerrainTypes = async () => {
      const { data, error } = await supabase
        .from('terrains')
        .select(`
          id,
          name,
          descriptions,
          icon,
          color,
          traversable,
          custom_image_url,
          use_custom_image,
          encounter_list_id,
          encounter_percentage
        `)
        .order('name');

      if (error) {
        console.error('Hiba a tereptípusok betöltésekor:', error);
        setNotification('Hiba a tereptípusok betöltésekor');
      } else {
        console.log('Lekért tereptípusok:', data);
        setTerrainTypes(data || []);
      }
    };

    fetchTerrainTypes();
  }, []);

  // Encounter Lists, Encounters és Events lekérése
  useEffect(() => {
    const fetchEncounterData = async () => {
      const { data: lists, error: listsError } = await supabase
        .from('encounter_lists')
        .select('*')
        .order('name');

      if (listsError) {
        console.error('Hiba az encounter listák betöltésekor:', listsError);
        setNotification('Hiba az Encounter listák betöltésekor!');
      } else {
        console.log('Lekért Encounter Listák:', lists);
        setEncounterLists(lists || []);
      }

      const { data: encs, error: encError } = await supabase
        .from('encounters')
        .select('*')
        .order('id');

      if (encError) {
        console.error('Hiba az Encounters betöltésekor:', encError);
        setNotification('Hiba az Encounters betöltésekor!');
      } else {
        console.log('Lekért Encounters:', encs);
        setEncounters(encs || []);
      }

      const { data: evts, error: evtsError } = await supabase
        .from('events')
        .select('*')
        .order('id');

      if (evtsError) {
        console.error('Hiba az Events betöltésekor:', evtsError);
        setNotification('Hiba az események betöltésekor!');
      } else {
        console.log('Lekért Events:', evts);
        setEvents(evts || []);
      }
    };

    fetchEncounterData();
  }, []);

  // Szörnyek lekérése
  useEffect(() => {
    const fetchMonsters = async () => {
      const { data, error } = await supabase
        .from('monsters')
        .select('*')
        .order('name');

      if (error) {
        console.error('Hiba a monsters betöltésekor:', error);
        setNotification('Hiba a Monster adatok betöltésekor');
      } else {
        console.log('Lekért Monsters:', data);
        setMonsters(data || []);
      }
    };

    fetchMonsters();
  }, []);

  // Látható csempék betöltése
  const loadVisibleTiles = useCallback(async () => {
    if (!characterState) {
      console.log('Character state not set. Skipping loadVisibleTiles.');
      return;
    }

    const minX = characterState.x - VIEWPORT_SIZE;
    const maxX = characterState.x + VIEWPORT_SIZE;
    const minY = characterState.y - VIEWPORT_SIZE;
    const maxY = characterState.y + VIEWPORT_SIZE;

    console.log(`Loading map tiles from (${minX}, ${minY}) to (${maxX}, ${maxY})`);

    const { data: tilesData, error: tilesError } = await supabase
      .from('map_tiles')
      .select(`
        x,
        y,
        terrain_id,
        event_id,
        event_chance
      `)
      .gte('x', minX)
      .lte('x', maxX)
      .gte('y', minY)
      .lte('y', maxY);

    if (tilesError) {
      console.error('Hiba a térkép betöltésekor:', tilesError);
      setNotification('Hiba a térkép betöltésekor');
      return;
    }

    console.log('Lekért map_tiles:', tilesData);
    const newTiles = new Map<string, MapTile>();
    tilesData?.forEach(tile => {
      if (tile.event_id) {
        const event = events.find(e => e.id === tile.event_id);
        if (event) {
          if (event.is_once && completedOnceEvents.has(event.id)) {
            newTiles.set(`${tile.x},${tile.y}`, {
              ...tile,
              event: undefined
            });
          } else {
            newTiles.set(`${tile.x},${tile.y}`, {
              ...tile,
              event: event
            });
          }
        } else {
          newTiles.set(`${tile.x},${tile.y}`, {
            ...tile,
            event: undefined
          });
        }
      } else {
        newTiles.set(`${tile.x},${tile.y}`, {
          ...tile,
          event: undefined
        });
      }
    });
    setMapTiles(newTiles);
  }, [characterState, events, completedOnceEvents]);

  useEffect(() => {
    if (characterState) {
      loadVisibleTiles();
    }
  }, [characterState, loadVisibleTiles]);

  const getRandomEncounter = (encounterListId: string): Encounter | null => {
    const relevantEncounters = encounters.filter(enc => enc.encounter_list_id === encounterListId);
    console.log(`Encounters found for Encounter List ID ${encounterListId}:`, relevantEncounters);

    if (relevantEncounters.length === 0) {
      console.log(`No encounters found for Encounter List ID ${encounterListId}`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * relevantEncounters.length);
    const selectedEncounter = relevantEncounters[randomIndex];
    console.log(`Randomly selected Encounter:`, selectedEncounter);
    return selectedEncounter || null;
  };

  const checkForEvents = async (tile: MapTile) => {
    if (tile.event_id) {
      const roll = Math.random() * 100;
      console.log(`Character stepped on tile (${tile.x}, ${tile.y}) with predefined event.`);
      console.log(`Encounter Chance: ${tile.event_chance}%`);
      console.log(`Roll: ${roll}`);

      const event = events.find(e => e.id === tile.event_id);
      if (!event) {
        console.log(`Event with ID ${tile.event_id} not found.`);
        return;
      }

      if (event.is_once && completedOnceEvents.has(event.id)) {
        console.log(`Event ${event.id} is 'is_once' and already completed by the character.`);
        return;
      }

      if (roll <= (tile.event_chance || 0)) {
        console.log(`Encounter triggered on tile (${tile.x}, ${tile.y}) with predefined event.`);
        if (event.type === 'Harc' && event.monster_id) {
          const monster = monsters.find(m => m.id === event.monster_id);
          if (monster) {
            setCurrentCombat({ monster });
            console.log(`Combat started with monster:`, monster);
          } else {
            console.log(`Monster with ID ${event.monster_id} not found.`);
          }
        } else if (event.type === 'Bolt' && event.shop_name) {
          try {
            const { data: store, error: storeError } = await supabase
              .from('stores')
              .select('id')
              .eq('name', event.shop_name)
              .single();

            if (storeError) {
              setNotification('Hiba a bolt adatok lekérésekor');
              console.error('Store fetch error:', storeError);
              return;
            }

            setCurrentStoreId(store.id);
            setCurrentStore(true);
            console.log(`Store encountered: ${store.id} on tile (${tile.x}, ${tile.y})`);
          } catch (err: any) {
            setNotification('Hiba a bolt megnyitása során.');
            console.error('Store encounter error:', err);
          }
        }

        if (event.is_once) {
          try {
            const { error: insertError } = await supabase
              .from('character_events')
              .insert([{ character_id: selectedCharacter?.id, event_id: event.id }]);

            if (insertError) {
              throw insertError;
            }

            setCompletedOnceEvents(prev => new Set(prev).add(event.id));

            setMapTiles(prevTiles => {
              const updatedTiles = new Map(prevTiles);
              updatedTiles.set(`${tile.x},${tile.y}`, {
                ...tile,
                event: undefined
              });
              return updatedTiles;
            });

            setNotification('Eseményt sikeresen végrehajtottál!');
            console.log(`Event ${event.id} marked as completed for character.`);
          } catch (error: any) {
            console.error('Hiba az esemény végrehajtásakor:', error);
            setNotification('Hiba az esemény végrehajtásakor.');
          }
        }
      } else {
        console.log(`No encounter triggered on tile (${tile.x}, ${tile.y}) with predefined event.`);
      }
    } else {
      const terrain = terrainTypes.find(t => t.id === tile.terrain_id);
      if (terrain && terrain.encounter_list_id && terrain.encounter_percentage !== undefined) {
        const roll = Math.random() * 100;
        console.log(`Character stepped on tile (${tile.x}, ${tile.y}) with terrain encounter.`);
        console.log(`Encounter List ID: ${terrain.encounter_list_id}`);
        console.log(`Encounter Percentage: ${terrain.encounter_percentage}%`);
        console.log(`Roll: ${roll}`);
        if (roll <= terrain.encounter_percentage) {
          const randomEncounter = getRandomEncounter(terrain.encounter_list_id);
          if (randomEncounter) {
            const event = events.find(e => e.id === randomEncounter.event_id);
            if (event) {
              console.log(`Random Encounter triggered: Event ID ${event.id} on tile (${tile.x}, ${tile.y})`);
              if (event.type === 'Harc' && event.monster_id) {
                const monster = monsters.find(m => m.id === event.monster_id);
                if (monster) {
                  setCurrentCombat({ monster });
                  console.log(`Combat started with monster:`, monster);
                } else {
                  console.log(`Monster with ID ${event.monster_id} not found.`);
                }
              } else if (event.type === 'Bolt' && event.shop_name) {
                try {
                  const { data: store, error: storeError } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('name', event.shop_name)
                    .single();

                  if (storeError) {
                    setNotification('Hiba a bolt adatok lekérésekor');
                    console.error('Store fetch error:', storeError);
                    return;
                  }

                  setCurrentStoreId(store.id);
                  setCurrentStore(true);
                  console.log(`Store encountered: ${store.id} on tile (${tile.x}, ${tile.y})`);
                } catch (err: any) {
                  setNotification('Hiba a bolt megnyitása során.');
                  console.error('Store encounter error:', err);
                }
              }
            } else {
              console.log(`Event with ID ${randomEncounter.event_id} not found.`);
            }
          } else {
            console.log(`No valid random encounter found for Encounter List ID ${terrain.encounter_list_id}`);
          }
        } else {
          console.log(`No random encounter triggered on tile (${tile.x}, ${tile.y}) with terrain encounter.`);
        }
      } else {
        console.log(`Character stepped on tile (${tile.x}, ${tile.y}) with no encounter.`);
      }
    }
  };

  const handleTileDescription = (x: number, y: number, terrain: TerrainType) => {
    setCurrentDescription(null);
    if (terrain.descriptions && terrain.descriptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * terrain.descriptions.length);
      const description = terrain.descriptions[randomIndex];
      setCurrentDescription(description);
      console.log(`Tile (${x}, ${y}) Description: ${description}`);
    }
  };

  // Mozgás kezelése (egy mező = 1 óra, incrementTime hívása)
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (
        !characterState ||
        showInventory ||
        showCrafting ||
        showCharacterSheet ||
        currentCombat ||
        currentStore
      )
        return;

      let newX = characterState.x;
      let newY = characterState.y;

      switch (e.key) {
        case 'ArrowUp':
          newY = Math.max(0, characterState.y - 1);
          break;
        case 'ArrowDown':
          newY = Math.min(999, characterState.y + 1);
          break;
        case 'ArrowLeft':
          newX = Math.max(0, characterState.x - 1);
          break;
        case 'ArrowRight':
          newX = Math.min(999, characterState.x + 1);
          break;
        default:
          return;
      }

      if (newX !== characterState.x || newY !== characterState.y) {
        const targetTile = mapTiles.get(`${newX},${newY}`);
        const terrain: TerrainType | null = targetTile
          ? terrainTypes.find(t => t.id === targetTile.terrain_id) ?? null
          : null;

        console.log(`Attempting to move to tile (${newX}, ${newY})`);

        if (!terrain || terrain.traversable) {
          const { error } = await supabase
            .from('character_states')
            .update({ x: newX, y: newY })
            .eq('id', characterState.id);

          if (error) {
            console.error('Hiba a mozgás során:', error);
            setNotification('Hiba a mozgás során');
          } else {
            const updatedState = { ...characterState, x: newX, y: newY };
            setCharacterState(updatedState);
            console.log(`Player moved to tile (${newX}, ${newY})`);

            if (targetTile && terrain) {
              if (terrain.encounter_list_id) {
                console.log(`Tile Terrain Encounter List ID: ${terrain.encounter_list_id}`);
                console.log(`Tile Terrain Encounter Percentage: ${terrain.encounter_percentage}%`);
              }
              checkForEvents(targetTile);
              handleTileDescription(newX, newY, terrain);
              incrementTime(); // Minden mozgás egy órába kerül, incrementTime hívás
            }
          }
        } else {
          console.log(`Tile (${newX}, ${newY}) is not traversable.`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    characterState,
    mapTiles,
    terrainTypes,
    showInventory,
    showCrafting,
    showCharacterSheet,
    currentCombat,
    currentStore,
    encounters,
    encounterLists,
    events,
    monsters,
    incrementTime,
  ]);

  const getTerrainColor = (terrain: TerrainType | null): string => {
    if (!terrain) return 'rgb(31, 41, 55)';
    switch (terrain.color) {
      case 'red': return 'rgb(239, 68, 68)';
      case 'green': return 'rgb(34, 197, 94)';
      case 'blue': return 'rgb(59, 130, 246)';
      case 'yellow': return 'rgb(234, 179, 8)';
      case 'purple': return 'rgb(168, 85, 247)';
      case 'pink': return 'rgb(236, 72, 153)';
      case 'orange': return 'rgb(249, 115, 22)';
      case 'brown': return 'rgb(120, 53, 15)';
      case 'teal': return 'rgb(20, 184, 166)';
      case 'gray': return 'rgb(107, 114, 128)';
      default: return 'rgb(31, 41, 55)';
    }
  };

  const renderGrid = () => {
    if (!characterState) return null;
    const grid = [];
    const size = VIEWPORT_SIZE * 2 + 1;

    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        const mapX = characterState.x - VIEWPORT_SIZE + x;
        const mapY = characterState.y - VIEWPORT_SIZE + y;
        const tile = mapTiles.get(`${mapX},${mapY}`);
        const terrain: TerrainType | null = tile
          ? terrainTypes.find(t => t.id === tile.terrain_id) ?? null
          : null;
        const isCharacter = mapX === characterState.x && mapY === characterState.y;

        row.push(
          <div
            key={`${mapX},${mapY}`}
            className="w-12 h-12 border border-gray-700 flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundColor: getTerrainColor(terrain),
            }}
          >
            {terrain && terrain.use_custom_image && terrain.custom_image_url ? (
              <img
                src={terrain.custom_image_url}
                alt={terrain.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : terrain && terrain.icon ? (
              React.createElement(
                (Icons as any)[terrain.icon],
                { className: "w-6 h-6 text-white" }
              )
            ) : null}
            {isCharacter && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icons.User className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}
            {tile?.event && (
              <div className="absolute top-0 right-0">
                <Icons.Sparkles className="w-6 h-6 text-white drop-shadow-lg animate-pulse" />
              </div>
            )}
          </div>
        );
      }
      grid.push(
        <div key={y} className="flex">
          {row}
        </div>
      );
    }

    return grid;
  };

  const camp = async () => {
    if (!characterState) return;

    const newFatigue = 18;
    console.log(`Attempting to reset fatigue to ${newFatigue} for character ID ${characterState.id}`);

    const { error } = await supabase
      .from('character_states')
      .update({
        fatigue: newFatigue,
        last_fatigue_decrement_hour: time ? time.hour : characterState.last_fatigue_decrement_hour
      })
      .eq('id', characterState.id);

    if (error) {
      console.error('Hiba a fatigue frissítésekor:', error);
      setNotification('Hiba a fatigue frissítésekor');
    } else {
      setCharacterState({ ...characterState, fatigue: newFatigue });
      setLastFatigueDecrement(time ? time.hour : lastFatigueDecrement);
      setNotification('Karakter táborozott és fáradtságát visszaállította!');
      console.log(`Fatigue reset to: ${newFatigue}`);
    }
  };

  const shortRest = async () => {
    if (!characterState) return;
    if (characterState.fatigue === 0) {
      console.log('Cannot perform short rest. Fatigue is already 0.');
      return;
    }

    setIsResting(true);

    const quarterHealth = Math.floor(characterState.max_health / 4);
    const newHealth = Math.min(characterState.current_health + quarterHealth, characterState.max_health);
    const newFatigue = Math.max(characterState.fatigue, 0);

    console.log(`Attempting to restore ${quarterHealth} health and decrease fatigue by 1 for character ID ${characterState.id}`);

    const { error } = await supabase
      .from('character_states')
      .update({
        current_health: newHealth,
        fatigue: newFatigue,
        last_fatigue_decrement_hour: time ? time.hour : characterState.last_fatigue_decrement_hour
      })
      .eq('id', characterState.id);

    if (error) {
      console.error('Hiba a rövid pihenő során:', error);
      setNotification('Hiba a rövid pihenő során.');
      setIsResting(false);
    } else {
      setCharacterState({
        ...characterState,
        current_health: newHealth,
        fatigue: newFatigue
      });
      setLastFatigueDecrement(time ? time.hour : lastFatigueDecrement);
      setNotification(`Rövid pihenő megtörtént! HP: ${newHealth}/${characterState.max_health}, Fáradtság: ${newFatigue}/18`);
      await addTime(1);
      console.log(`Health increased to: ${newHealth}, Fatigue decreased to: ${newFatigue}`);
      setIsResting(false);
    }
  };

  // Idő múlásával fáradtság csökkentése
  useEffect(() => {
    if (characterState && time) {
      if (isResting) return;

      let hoursPassed = 0;
      if (time.hour > lastFatigueDecrement) {
        hoursPassed = time.hour - lastFatigueDecrement;
      } else if (time.hour < lastFatigueDecrement) {
        hoursPassed = time.hour + (24 - lastFatigueDecrement);
      }

      if (hoursPassed > 0) {
        const fatigueToDecrease = Math.min(hoursPassed, characterState.fatigue);
        const newFatigue = characterState.fatigue - fatigueToDecrease;

        console.log(`Decreasing fatigue by ${fatigueToDecrease} due to ${hoursPassed} hours passed.`);

        supabase
          .from('character_states')
          .update({
            fatigue: newFatigue,
            last_fatigue_decrement_hour: time.hour
          })
          .eq('id', characterState.id)
          .then(({ error }) => {
            if (error) {
              console.error('Hiba a fatigue frissítésekor:', error);
              setNotification('Hiba a fatigue frissítésekor');
            } else {
              setCharacterState({ ...characterState, fatigue: newFatigue });
              setLastFatigueDecrement(time.hour);
              console.log(`Fatigue decreased to: ${newFatigue}`);
            }
          });
      }
    }
  }, [time, characterState, lastFatigueDecrement, isResting]);

  // Éhség csökkentése idő múlásával
  useEffect(() => {
    if (characterState && time) {
      if (isResting) return;

      let hoursPassed = 0;
      if (time.hour > lastHungerDecrement) {
        hoursPassed = time.hour - lastHungerDecrement;
      } else if (time.hour < lastHungerDecrement) {
        hoursPassed = time.hour + (24 - lastHungerDecrement);
      }

      const hungerIntervals = Math.floor(hoursPassed / 12);
      if (hungerIntervals > 0) {
        const hungerToDecrease = hungerIntervals;
        const newHunger = Math.max(characterState.hunger - hungerToDecrease, 0);

        console.log(`Decreasing hunger by ${hungerToDecrease} due to ${hungerIntervals * 12} hours passed.`);

        supabase
          .from('character_states')
          .update({
            hunger: newHunger,
            last_hunger_decrement_hour: (lastHungerDecrement + hungerIntervals * 12) % 24
          })
          .eq('id', characterState.id)
          .then(({ error }) => {
            if (error) {
              console.error('Hiba az éhség frissítésekor:', error);
              setNotification('Hiba az éhség frissítésekor');
            } else {
              setCharacterState({ ...characterState, hunger: newHunger });
              setLastHungerDecrement((lastHungerDecrement + hungerIntervals * 12) % 24);
              console.log(`Hunger decreased to: ${newHunger}`);
            }
          });
      }
    }
  }, [time, characterState, lastHungerDecrement, isResting]);

  // Szomjúság csökkentése idő múlásával
  useEffect(() => {
    if (characterState && time) {
      if (isResting) return;

      let hoursPassed = 0;
      if (time.hour > lastThirstDecrement) {
        hoursPassed = time.hour - lastThirstDecrement;
      } else if (time.hour < lastThirstDecrement) {
        hoursPassed = time.hour + (24 - lastThirstDecrement);
      }

      const thirstIntervals = Math.floor(hoursPassed / 6);
      if (thirstIntervals > 0) {
        const thirstToDecrease = thirstIntervals;
        const newThirst = Math.max(characterState.thirst - thirstToDecrease, 0);

        console.log(`Decreasing thirst by ${thirstToDecrease} due to ${thirstIntervals * 6} hours passed.`);

        supabase
          .from('character_states')
          .update({
            thirst: newThirst,
            last_thirst_decrement_hour: (lastThirstDecrement + thirstIntervals * 6) % 24
          })
          .eq('id', characterState.id)
          .then(({ error }) => {
            if (error) {
              console.error('Hiba a szomjúság frissítésekor:', error);
              setNotification('Hiba a szomjúság frissítésekor');
            } else {
              setCharacterState({ ...characterState, thirst: newThirst });
              setLastThirstDecrement((lastThirstDecrement + thirstIntervals * 6) % 24);
              console.log(`Thirst decreased to: ${newThirst}`);
            }
          });
      }
    }
  }, [time, characterState, lastThirstDecrement, isResting]);

  // Játék indítása
  const startGame = async (character: CharacterData) => {
    console.log(`Starting game with character ID: ${character.id}`);

    const { data: existingState, error: stateError } = await supabase
      .from('character_states')
      .select('*')
      .eq('character_id', character.id)
      .single();

    if (stateError && stateError.code !== 'PGRST116') {
      console.error('Hiba a karakter állapot ellenőrzésekor:', stateError);
      setNotification('Hiba a karakter állapot ellenőrzésekor');
      return;
    }

    if (existingState) {
      console.log('Már létező karakter állapot betöltése:', existingState);
      setCharacterState(existingState);
      setSelectedCharacter(character);
      setLastFatigueDecrement(existingState.last_fatigue_decrement_hour);
      setLastHungerDecrement(existingState.last_hunger_decrement_hour);
      setLastThirstDecrement(existingState.last_thirst_decrement_hour);
      setPreviousInventory(existingState.inventory);

      const { data: completedEvents, error: completedError } = await supabase
        .from('character_events')
        .select('event_id')
        .eq('character_id', character.id);

      if (completedError) {
        console.error('Hiba a végrehajtott események lekérésekor:', completedError);
        setNotification('Hiba a végrehajtott események lekérésekor');
      } else {
        const completedEventIds = new Set<string>(
          completedEvents?.map(event => event.event_id) || []
        );
        setCompletedOnceEvents(completedEventIds);
      }
    } else {
      console.log(`No existing state found for character ID ${character.id}. Creating new state.`);

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('base_hp')
        .eq('name', character.class)
        .single();

      if (classError) {
        console.error('Hiba az osztály adatok lekérésekor:', classError);
        setNotification('Hiba az osztály adatok lekérésekor');
        return;
      }

      const baseHp = classData.base_hp || 0;
      const constitutionValue = character.attributes['Egészség'] || 0;
      const maxHealth = constitutionValue + baseHp;

      console.log(`Creating new character state with maxHealth: ${maxHealth}`);

      const { data: newState, error: createError } = await supabase
        .from('character_states')
        .insert([{
          character_id: character.id,
          x: 500,
          y: 500,
          current_health: maxHealth,
          max_health: maxHealth,
          inventory: [],
          maxInventorySize: 20,
          cash: { gold: 0, silver: 0, copper: 0 },
          equipped_items: {
            weapon: null,
            armor: null,
            shield: null,
            ranged_weapon: null,
            amulet: null,
            ring: null,
            gloves: null,
            boots: null,
            cloak: null,
            belt: null,
            ammunition: null,
          },
          skills: [],
          level: 1,
          total_attack: 0,
          total_defense: 0,
          base_attack: 10,
          base_defense: 5,
          fatigue: 18,
          hunger: 6,
          thirst: 6,
          temperature: 20,
          last_fatigue_decrement_hour: 0,
          last_hunger_decrement_hour: 0,
          last_thirst_decrement_hour: 0,
        }])
        .select()
        .single();

      if (createError) {
        console.error('Hiba a karakter állapot létrehozásakor:', createError);
        setNotification('Hiba a karakter állapot létrehozásakor');
        return;
      }

      console.log('Új karakter állapot létrehozva:', newState);
      setCharacterState(newState);
      setSelectedCharacter(character);
      setLastFatigueDecrement(newState.last_fatigue_decrement_hour);
      setLastHungerDecrement(newState.last_hunger_decrement_hour);
      setLastThirstDecrement(newState.last_thirst_decrement_hour);
      setPreviousInventory(newState.inventory);
      setCompletedOnceEvents(new Set());
    }
  };

  const gather = () => {
    console.log('Gyűjtögetés gomb megnyomva');
    setShowGathering(true);
  };

  // Realtime Subscription a character_states táblára
  useEffect(() => {
    if (!characterState) return;

    const subscription = supabase
      .channel(`public:character_states:id=eq.${characterState.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'character_states', filter: `id=eq.${characterState.id}` },
        async (payload: PostgrestRealtimePayload<any>) => {
          console.log('Realtime update received:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newState = payload.new as CharacterState;

            // Ellenőrizzük, van-e új tárgy az inventoryban
            const oldInventory = previousInventory;
            const newInventory = newState.inventory;
            const oldSet = new Set(oldInventory);
            const newSet = new Set(newInventory);

            let hasNewItem = false;
            for (const itemId of newSet) {
              if (!oldSet.has(itemId)) {
                hasNewItem = true;
                break;
              }
            }

            setCharacterState(newState);
            setLastFatigueDecrement(newState.last_fatigue_decrement_hour);
            setLastHungerDecrement(newState.last_hunger_decrement_hour);
            setLastThirstDecrement(newState.last_thirst_decrement_hour);
            setPreviousInventory(newInventory);

            if (hasNewItem) {
              await arrangeItemsInStorage(newState);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [characterState?.id, previousInventory]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 relative">
      {/* Header */}
      <header className="grid grid-cols-3 items-center px-6 py-4 bg-gray-700 shadow-md">
        <div>
          {selectedCharacter && (
            <button
              onClick={() => navigate('/main-menu')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              ← Vissza a főmenübe
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white text-center">Játék</h1>
        <div className="flex items-center justify-end space-x-4">
          {characterState && (
            <>
              <div className="text-white text-sm">
                Pozíció: ({characterState.x}, {characterState.y})
              </div>
              {time ? <TimeDisplay time={time} /> : <div className="text-white">Idő betöltése...</div>}
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 flex">
        {!selectedCharacter ? (
          <div className="max-w-2xl mx-auto w-full">
            <h2 className="text-xl font-bold text-white mb-4">Válassz karaktert</h2>
            <div className="grid gap-4">
              {characters.map(character => (
                <button
                  key={character.id}
                  onClick={() => startGame(character)}
                  className="bg-gray-800 p-4 rounded-lg text-white hover:bg-gray-700 transition w-full"
                >
                  <h3 className="font-bold">{character.name}</h3>
                  <p className="text-gray-400">
                    {character.species} - {character.class}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex">
            {/* Bal oldali oszlop: Karakter adatok */}
            <div className="w-64 bg-gray-800 p-4 rounded-lg mr-6 flex flex-col">
              <h2 className="text-white font-bold mb-4">{selectedCharacter.name}</h2>
              <div className="text-gray-300 space-y-2 flex-1">
                <p>Faj: {selectedCharacter.species}</p>
                <p>Kaszt: {selectedCharacter.class}</p>
                {characterState && (
                  <p>HP: {characterState.current_health}/{characterState.max_health}</p>
                )}
                {characterState && (
                  <FatigueIndicator fatigue={characterState.fatigue} />
                )}
                {characterState && (
                  <HungerIndicator hunger={characterState.hunger} />
                )}
                {characterState && (
                  <ThirstIndicator thirst={characterState.thirst} />
                )}
                {characterState && (
                  <p>Szint: {characterState.level}</p>
                )}
                {characterState && (
                  <p>Atk: {characterState.total_attack} | Def: {characterState.total_defense}</p>
                )}
              </div>
            </div>

            {/* Középső oszlop: Térkép */}
            <div className="flex-1 flex flex-col items-center mr-6">
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <div className="flex flex-col items-center">
                  {renderGrid()}
                </div>
              </div>

              {currentDescription && (
                <div className="bg-gray-800 bg-opacity-90 text-white p-4 mt-4 rounded-lg w-full max-w-md">
                  <p className="text-lg break-words">{currentDescription}</p>
                </div>
              )}
            </div>

            {/* Jobb oldali oszlop: Akciógombok */}
            <div className="w-64 bg-gray-800 p-4 rounded-lg flex flex-col space-y-4">
              <button
                onClick={() => setShowCharacterSheet(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Icons.FileSpreadsheet className="w-5 h-5" />
                Karakterlap
              </button>
              <button
                onClick={() => setShowInventory(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Icons.Backpack className="w-5 h-5" />
                Felszerelés
              </button>
              <button
                onClick={() => setShowCrafting(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Icons.Hammer className="w-5 h-5" />
                Tárgyak készítése
              </button>
              <button
                onClick={gather}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Icons.Search className="w-5 h-5 mr-2" />
                Gyűjtögetés
              </button>
              <button
                onClick={shortRest}
                disabled={characterState?.fatigue === 0}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 mt-4 ${
                  characterState?.fatigue === 0
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Icons.Moon className="w-5 h-5 mr-2" />
                Rövid pihenő
              </button>
              <div className="flex-grow"></div>
              {characterState && characterState.fatigue === 0 && (
                <button
                  onClick={camp}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 mt-4"
                >
                  <Icons.LogOut className="w-5 h-5 mr-2" />
                  Táborozás
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <p className="text-white mb-4">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showCharacterSheet && characterState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-[600px] h-[900px] overflow-hidden flex flex-col">
            <h3 className="text-white font-bold text-xl mb-4">Karakterlap</h3>
            <div className="flex-1 overflow-auto">
              <CharacterSheet
                character={selectedCharacter}
                characterState={characterState}
                onClose={() => setShowCharacterSheet(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showInventory && characterState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-white font-bold text-xl mb-4">Felszerelés</h3>
            <InventoryUtil
              characterState={characterState}
              onClose={() => setShowInventory(false)}
            />
          </div>
        </div>
      )}

      {showCrafting && characterState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-white font-bold text-xl mb-4">Tárgyak készítése</h3>
            <CreateItem
              characterState={characterState}
              onClose={() => setShowCrafting(false)}
              onItemCrafted={async () => {
                setShowCrafting(false);
                const { data, error } = await supabase
                  .from('character_states')
                  .select('*')
                  .eq('id', characterState.id)
                  .single();
                if (error) {
                  console.error('Hiba a karakter állapot frissítésekor:', error);
                } else if (data) {
                  console.log('Frissített karakter állapot:', data);
                  setCharacterState(data);
                  setLastFatigueDecrement(data.last_fatigue_decrement_hour);
                  setLastHungerDecrement(data.last_hunger_decrement_hour);
                  setLastThirstDecrement(data.last_thirst_decrement_hour);
                }
              }}
              addTime={addTime}
            />
          </div>
        </div>
      )}

      {currentCombat && (
        <Combat
          characterState={characterState}
          monster={currentCombat.monster}
          onEscape={() => {
            setCurrentCombat(null);
            console.log('Harc kilépve.');
          }}
        />
      )}

      {currentStore && characterState && currentStoreId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-white font-bold text-xl mb-4">Bolt</h3>
            <Store
              initialCharacterState={characterState}
              onClose={() => {
                setCurrentStore(false);
                console.log('Bolt bezárva.');
              }}
              storeId={currentStoreId}
            />
          </div>
        </div>
      )}

      {showGathering && characterState && (
        <Gathering
          terrainId={mapTiles.get(`${characterState.x},${characterState.y}`)?.terrain_id || ''}
          characterId={characterState.id}
          onClose={() => setShowGathering(false)}
        />
      )}
    </div>
  );
};

export default PlayGame;
