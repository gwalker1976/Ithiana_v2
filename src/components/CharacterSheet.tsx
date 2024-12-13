// src/components/CharacterSheet.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CharacterData, CharacterState, Class, Item, Skill, CharacterSkillEntry, Cash, Ability } from './types/interface';

interface CharacterSheetProps {
  character: CharacterData;
  characterState: CharacterState;
  onClose: () => void;
}

type Tab = 'attributes' | 'skills' | 'abilities' | 'equipment';

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  character,
  characterState,
  onClose,
}) => {
  const [equippedItems, setEquippedItems] = useState<Record<string, Item>>({});
  const [classData, setClassData] = useState<Class | null>(null);
  const [currentState, setCurrentState] = useState<CharacterState>(characterState);
  const [loading, setLoading] = useState(true);

  // Új állapot a skilljei tárolására
  const [skills, setSkills] = useState<(Skill & { level: number })[]>([]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<Tab>('attributes');

  // Fetch character state
  const fetchCharacterState = async () => {
    try {
      const { data, error } = await supabase
        .from('character_states')
        .select('*')
        .eq('id', characterState.id)
        .single();

      if (error) {
        console.error('Error fetching character state:', error);
        return;
      }

      setCurrentState(data);
      await fetchEquippedItems(data);
      await fetchSkills(data.skills);
    } catch (err) {
      console.error('Error in fetchCharacterState:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch skills
  const fetchSkills = async (skillsEntries: CharacterSkillEntry[]) => {
    const skillIds = skillsEntries.map(skill => skill.skill_id);
    if (skillIds.length === 0) {
      setSkills([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .in('id', skillIds);

      if (error) {
        console.error('Error fetching skills:', error);
        return;
      }

      const skillsWithLevel = data.map((skill: Skill) => {
        const skillEntry = skillsEntries.find(s => s.skill_id === skill.id);
        return { ...skill, level: skillEntry?.skill_level || 1 };
      });

      setSkills(skillsWithLevel);
    } catch (err) {
      console.error('Error in fetchSkills:', err);
    }
  };

  useEffect(() => {
    fetchCharacterState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel(`character_state_${characterState.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'character_states',
          filter: `id=eq.${characterState.id}`
        },
        async (payload) => {
          console.log('Character state updated:', payload.new);
          await fetchCharacterState();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterState.id]);

  // Fetch class data
  useEffect(() => {
    const fetchClassData = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('base_hp, hp_per_level, energy_attribute, base_energy, energy_per_level, id, name, species, abilities')
          .eq('name', character.class)
          .single();

        if (error) {
          console.error('Error fetching class data:', error);
          return;
        }

        setClassData(data);
      } catch (err) {
        console.error('Error in fetchClassData:', err);
      }
    };

    fetchClassData();
  }, [character.class]);

  // Fetch equipped items
  const fetchEquippedItems = async (state: CharacterState) => {
    if (!state.equipped_items) {
      setEquippedItems({});
      return;
    }

    const itemIds = Object.values(state.equipped_items).filter(id => id);

    if (itemIds.length === 0) {
      setEquippedItems({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds);

      if (error) {
        console.error('Error fetching equipped items:', error);
        return;
      }

      const itemsMap: Record<string, Item> = {};
      data.forEach(item => {
        Object.entries(state.equipped_items || {}).forEach(([slot, id]) => {
          if (id === item.id) {
            itemsMap[slot] = item;
          }
        });
      });

      setEquippedItems(itemsMap);
    } catch (err) {
      console.error('Error in fetchEquippedItems:', err);
    }
  };

  // Bonus calculation
  const calculateBonus = (value: number): number => {
    if (value <= 9) return -1;
    if (value <= 11) return 0;
    if (value <= 13) return 1;
    return 2;
  };

  // Defense calculation
  const calculateDefense = (): number => {
    const dexterityBonus = calculateBonus(character.attributes['Ügyesség']);
    const itemDefense = Object.values(equippedItems)
      .reduce((total, item) => total + (item.defense || 0), 0);
    return dexterityBonus + itemDefense;
  };

  // Initiative calculation
  const calculateInitiative = (): number => {
    return calculateBonus(character.attributes['Ügyesség']);
  };

  // Attack calculation
  const calculateAttack = (): number => {
    const strengthBonus = calculateBonus(character.attributes['Erő']);
    const itemAttack = equippedItems.weapon?.attack || 0;
    return strengthBonus + currentState.level + itemAttack;
  };

  // Damage calculation
  const calculateDamage = (): string => {
    const strengthBonus = calculateBonus(character.attributes['Erő']);
    const weapon = equippedItems.weapon;
    
    if (!weapon?.damage) return 'Nincs fegyver';
    
    const { count, type, modifier } = weapon.damage;
    const totalModifier = modifier + strengthBonus;
    
    return `${count}${type}${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
  };

  // Energy calculation
  const calculateEnergy = (): { current: number; max: number } => {
    if (!classData) return { current: 0, max: 0 };

    const energyAttribute = classData.energy_attribute;
    const attributeValue = character.attributes[energyAttribute];
    const attributeBonus = calculateBonus(attributeValue);
    
    const firstLevelEnergy = attributeValue + classData.base_energy + attributeBonus;
    const levelBonus = (classData.energy_per_level + attributeBonus) * (currentState.level - 1);
    
    const maxEnergy = firstLevelEnergy + levelBonus;
    
    return { current: maxEnergy, max: maxEnergy };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
      </div>
    );
  }

  // Helper function to group abilities by level
  const groupAbilitiesByLevel = (abilities: Ability[]) => {
    const grouped: Record<number, Ability[]> = {};
    abilities.forEach(ability => {
      if (!grouped[ability.level]) {
        grouped[ability.level] = [];
      }
      grouped[ability.level].push(ability);
    });
    return grouped;
  };

  const abilitiesGrouped = classData ? groupAbilitiesByLevel(classData.abilities) : {};

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-2xl h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-extrabold">{character.name}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors duration-200"
          aria-label="Bezárás"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-700">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('attributes')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attributes'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Tulajdonságok
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'skills'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Skilljeid
          </button>
          <button
            onClick={() => setActiveTab('abilities')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'abilities'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Különleges Képességek
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'equipment'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Felszerelés
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex overflow-auto">
        {activeTab === 'attributes' && (
          <div className="flex-1 grid grid-cols-1 gap-4">
            {/* Karakter Információk */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Karakter Információk</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Faj:</span>
                  <span>{character.species}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Kaszt:</span>
                  <span>{character.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Szint:</span>
                  <span>{currentState.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">HP:</span>
                  <span>{currentState.current_health} / {currentState.max_health}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Energia:</span>
                  <span>{calculateEnergy().current} / {calculateEnergy().max}</span>
                </div>
              </div>
            </div>

            {/* Tulajdonságok */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Tulajdonságok</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(character.attributes).map(([attr, value]) => (
                  <div key={attr} className="flex justify-between">
                    <span className="capitalize font-medium">{attr}:</span>
                    <span>
                      {value}
                      <span className={`ml-1 text-xs ${calculateBonus(value) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({calculateBonus(value) >= 0 ? '+' : ''}{calculateBonus(value)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Harci Értékek */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Harci Értékek</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Védelem:</span>
                  <span>{calculateDefense()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Kezdeményezés:</span>
                  <span>{calculateInitiative()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Támadás:</span>
                  <span>{calculateAttack()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sebzés:</span>
                  <span>{calculateDamage()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-md overflow-auto">
            <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Skilljeid</h3>
            {skills.length === 0 ? (
              <p className="text-gray-400">Nincsenek skilljeid.</p>
            ) : (
              <ul className="space-y-4">
                {skills.map(skill => (
                  <li key={skill.id} className="bg-gray-700 p-4 rounded-lg flex items-start">
                    {/* Ha van kép a skillhez, itt adhatod hozzá */}
                    {/* <img src={skill.image_url} alt={skill.name} className="h-10 w-10 object-cover rounded mr-4" /> */}
                    <div className="flex-1">
                      <p className="font-medium text-lg">{skill.name}</p>
                      <p className="text-gray-400 text-sm">{skill.description}</p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <span className="mr-2">Szint:</span>
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{skill.level}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'abilities' && (
          <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-md overflow-auto">
            <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Különleges Képességek</h3>
            {classData && classData.abilities.length > 0 ? (
              Object.entries(abilitiesGrouped)
                .sort((a, b) => Number(a[0]) - Number(b[0])) // Sort by level
                .map(([level, abilities]) => (
                  <div key={level} className="mb-4">
                    <h4 className="text-lg font-semibold mb-2">Szint {level}</h4>
                    <ul className="space-y-2">
                      {abilities.map(ability => (
                        <li key={ability.id} className="bg-gray-700 p-4 rounded-lg flex items-start">
                          {ability.profile_image_url && (
                            <img src={ability.profile_image_url} alt={ability.name} className="h-10 w-10 object-cover rounded mr-4" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-lg">{ability.name}</p>
                            <p className="text-gray-400 text-sm">{ability.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
            ) : (
              <p className="text-gray-400">Nincsenek különleges képességeid.</p>
            )}
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-md overflow-auto">
            <h3 className="text-xl font-semibold mb-2 border-b border-gray-700 pb-1">Felszerelt Tárgyak</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(currentState.equipped_items || {})
                .filter(([slot, itemId]) => itemId && equippedItems[slot]?.image_url) // Only slots with items that have images
                .map(([slot]) => {
                  const item = equippedItems[slot];
                  return (
                    <div
                      key={slot}
                      className="bg-gray-700 p-4 rounded-lg transition-transform transform hover:scale-105 flex flex-col items-center"
                    >
                      <p className="text-xs text-gray-400 capitalize">{slot.replace('_', ' ')}</p>
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="mt-2 h-16 w-16 object-contain rounded max-w-full"
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="mt-4">
        <button
          onClick={onClose}
          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-colors duration-300"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
};

export default CharacterSheet;
