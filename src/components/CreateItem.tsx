// src/components/CreateItem.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Item } from './types/interface';

interface CharacterState {
  id: number; // Frissítve számmá
  inventory: string[];
  x: number;
  y: number;
}

interface CreateItemProps {
  characterState: CharacterState;
  onClose: () => void;
  onItemCrafted: () => void;
  addTime: (hours: number) => Promise<void>; // Új prop
}

export const CreateItem: React.FC<CreateItemProps> = ({ 
  characterState, 
  onClose,
  onItemCrafted,
  addTime // Új prop
}) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTerrain, setCurrentTerrain] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<CharacterState>(characterState);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current terrain
        const { data: terrainData, error: terrainError } = await supabase
          .from('map_tiles')
          .select('terrain_id')
          .eq('x', characterState.x)
          .eq('y', characterState.y)
          .single();

        if (terrainError) throw terrainError;
        setCurrentTerrain(terrainData?.terrain_id || null);

        // Get current character state
        const { data: stateData, error: stateError } = await supabase
          .from('character_states')
          .select('*')
          .eq('id', characterState.id)
          .single();

        if (stateError) throw stateError;
        setCurrentState(stateData);

        // Create inventory item count map
        const inventoryCount = stateData.inventory.reduce((acc: { [key: string]: number }, itemId: string) => {
          acc[itemId] = (acc[itemId] || 0) + 1;
          return acc;
        }, {});

        // Get all craftable items
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*');

        if (itemsError) throw itemsError;

        // Filter items that can be crafted here
        const craftableItems = itemsData.filter(item => {
          // Check if item can be crafted in current terrain
          const terrainOk = !item.crafting_terrain || item.crafting_terrain === terrainData?.terrain_id;
          
          // Check if player has all required components in sufficient quantities
          const hasComponents = item.components.every(component => 
            inventoryCount[component.itemId] && inventoryCount[component.itemId] >= component.quantity
          );

          return terrainOk && hasComponents;
        });

        setAvailableItems(craftableItems);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [characterState]);

  const craftItem = async (item: Item) => {
    try {
      setLoading(true);

      // Get fresh character state
      const { data: freshState, error: stateError } = await supabase
        .from('character_states')
        .select('*')
        .eq('id', characterState.id)
        .single();

      if (stateError) throw stateError;

      // Create a map to track used components and their quantities
      const usedComponents: { [key: string]: number } = {};
      
      // Create a new inventory array without the used components
      const newInventory = freshState.inventory.filter(id => {
        // If this item is a required component
        const component = item.components.find(c => c.itemId === id);
        if (component) {
          // Initialize counter if not exists
          usedComponents[id] = usedComponents[id] || 0;
          
          // If we still need this component
          if (usedComponents[id] < component.quantity) {
            usedComponents[id]++;
            return false; // Remove from inventory
          }
        }
        return true; // Keep in inventory
      });

      // Verify all components were found in sufficient quantities
      const allComponentsFound = item.components.every(
        component => usedComponents[component.itemId] === component.quantity
      );

      if (!allComponentsFound) {
        throw new Error('Nem áll rendelkezésre elegendő komponens!');
      }

      // Add crafted item to inventory
      newInventory.push(item.id);

      // Update character state
      const { error: updateError } = await supabase
        .from('character_states')
        .update({ inventory: newInventory })
        .eq('id', characterState.id);

      if (updateError) throw updateError;

      // Add crafting time to player's time
      await addTime(item.crafting_time); // Hívjuk meg az addTime függvényt

      onItemCrafted();
      setSelectedItem(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-white text-center">
        Betöltés...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center mb-4">
        Hiba történt: {error}
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Bezárás
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableItems.length === 0 ? (
        <p className="text-gray-400 text-center">
          Nincs elkészíthető tárgy ezen a helyen vagy hiányoznak a komponensek
        </p>
      ) : (
        <div className="space-y-4">
          {selectedItem ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={selectedItem.image_url || 'https://via.placeholder.com/80'}
                  alt={selectedItem.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <h4 className="text-white font-medium">{selectedItem.name}</h4>
                  <p className="text-gray-400 text-sm">{selectedItem.description}</p>
                  <p className="text-gray-400 text-sm">Súly: {selectedItem.weight} kg</p>
                  {selectedItem.components.length > 0 && (
                    <div className="mt-2">
                      <p className="text-gray-400 text-sm">Szükséges komponensek:</p>
                      <ul className="list-disc list-inside">
                        {selectedItem.components.map((component, index) => {
                          const componentItem = availableItems.find(item => item.id === component.itemId);
                          return (
                            <li key={index} className="text-gray-400 text-sm">
                              {componentItem?.name || 'Ismeretlen tárgy'} ({component.quantity} db)
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm mt-2">
                    Elkészítés ideje: {selectedItem.crafting_time} óra
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  disabled={loading}
                >
                  Vissza
                </button>
                <button
                  onClick={() => craftItem(selectedItem)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  disabled={loading}
                >
                  Elkészítés
                </button>
              </div>
            </div>
          ) : (
            
            <div className="space-y-2">
              {availableItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item)
                    console.log(item.image_url); // Kijavítva: selectedItem?.image_url helyett item.image_url
                  }}
                  className="w-full flex items-center gap-4 bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition"
                  disabled={loading}
                >
                  <img
                    src={item.image_url || 'https://via.placeholder.com/40'}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-gray-400 text-sm">{item.type}</p>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {item.weight} kg
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedItem && (
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          disabled={loading}
        >
          Bezárás
        </button>
      )}
    </div>
  );
};
