// src/components/NewItems.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Item, Component, TerrainType, RarityType, DiceType, ItemType, Spell } from './types/interface';

const NewItems: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]); // All available items
  const [terrainTypes, setTerrainTypes] = useState<TerrainType[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]); // Varázslatok betöltése
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(0);
  const [goldPrice, setGoldPrice] = useState(0);
  const [silverPrice, setSilverPrice] = useState(0);
  const [copperPrice, setCopperPrice] = useState(0);
  const [type, setType] = useState<ItemType>('Weapon');
  const [diceCount, setDiceCount] = useState(1);
  const [diceType, setDiceType] = useState<DiceType>('d6');
  const [diceModifier, setDiceModifier] = useState(0);
  const [attack, setAttack] = useState(0);
  const [defense, setDefense] = useState(0);
  const [components, setComponents] = useState<Component[]>([]);
  const [craftingTime, setCraftingTime] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [craftingTerrain, setCraftingTerrain] = useState<string>('');
  const [specialAbilities, setSpecialAbilities] = useState<string[]>(['']);
  const [rarity, setRarity] = useState<RarityType>('Common');
  const [wearable, setWearable] = useState(false);
  const [capacity, setCapacity] = useState(0);
  const [allowedItem1, setAllowedItem1] = useState<string>('');
  const [allowedItem2, setAllowedItem2] = useState<string>('');
  const [allowedItem3, setAllowedItem3] = useState<string>('');
  const [specialEffects, setSpecialEffects] = useState<string[]>(['']);
  const [requiredItemId, setRequiredItemId] = useState<string>('');
  const [isUsable, setIsUsable] = useState<boolean>(false);
  const [usableInCombat, setUsableInCombat] = useState<boolean>(false);
  const [servingValue, setServingValue] = useState<number>(0); // Élelemhez
  const [collectionTerrain, setCollectionTerrain] = useState<string>(''); // Élelemhez
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New state variables for sorting and filtering
  const [sortField, setSortField] = useState<'name' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const itemTypes: ItemType[] = [
    'Weapon',
    'Armor',
    'Shield',
    'RangedWeapon',
    'Amulet',
    'Ring',
    'Gloves',
    'Boots',
    'Cloak',
    'Belt',
    'Material',
    'Ammunition',
    'Storage',
    'Élelem' // Új típus
  ];

  const diceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const rarityTypes: RarityType[] = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique', 'Epic', 'Legendary'];

  // Dinamikus specialEffectOptions a varázslatok alapján
  const specialEffectOptions = useMemo(() => spells.map(spell => spell.name), [spells]);

  useEffect(() => {
    fetchItems();
    fetchTerrainTypes();
    fetchAvailableItems(); // Elérhető tárgyak betöltése
    fetchSpells(); // Varázslatok betöltése
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a tárgyak betöltésekor');
    } else {
      setItems(data || []);
    }
  };

  const fetchAvailableItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba az elérhető tárgyak betöltésekor');
    } else {
      setAvailableItems(data || []);
    }
  };

  const fetchTerrainTypes = async () => {
    const { data, error } = await supabase
      .from('terrains')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a tereptípusok betöltésekor');
    } else {
      setTerrainTypes(data || []);
    }
  };

  const fetchSpells = async () => {
    const { data, error } = await supabase
      .from('spells')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a varázslatok betöltésekor');
    } else {
      setSpells(data || []);
    }
  };

  const addComponent = () => {
    if (components.length < 3) {
      setComponents([...components, { itemId: '', quantity: 1 }]);
    }
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof Component, value: string | number) => {
    const newComponents = [...components];
    newComponents[index] = {
      ...newComponents[index],
      [field]: value
    };
    setComponents(newComponents);
  };

  const validateForm = (): string | null => {
    if (!name) return 'A név megadása kötelező!';
    if (!description) return 'A leírás megadása kötelező!';
    if (weight <= 0) return 'Érvényes súly megadása kötelező!';
    if (!type) return 'A típus kiválasztása kötelező!';
    if (craftingTime < 1) return 'Az elkészítési idő nem lehet kevesebb, mint 1 perc!';
    
    if (goldPrice < 0 || silverPrice < 0 || copperPrice < 0) {
      return 'Az árak nem lehetnek negatívak!';
    }

    if (goldPrice === 0 && silverPrice === 0 && copperPrice === 0) {
      return 'Legalább egy ár megadása kötelező!';
    }
    
    if (type === 'Weapon' || type === 'RangedWeapon') {
      if (diceCount <= 0) return 'Érvényes kockaszám megadása kötelező!';
      if (attack === undefined || attack === null) return 'A támadás bónusz megadása kötelező!';
    }
    
    if (type === 'Armor' || type === 'Shield') {
      if (defense === undefined || defense === null) return 'A védelem érték megadása kötelező!';
    }

    if (type === 'Storage') {
      if (capacity <= 0) return 'Érvényes kapacitás megadása kötelező!';
      
      // Legalább egy engedélyezett tárgy megadása
      if (!allowedItem1 && !allowedItem2 && !allowedItem3) {
        return 'Legalább egy engedélyezett tárgy megadása kötelező!';
      }

      // Duplikált tárgyak ellenőrzése
      const selectedItems = [allowedItem1, allowedItem2, allowedItem3].filter(item => item !== '');
      const uniqueItems = new Set(selectedItems);
      if (uniqueItems.size !== selectedItems.length) {
        return 'Az engedélyezett tárgyaknak egyedinek kell lenniük!';
      }
    }

    if (type === 'Élelem') {
      if (servingValue <= 0) return 'Érvényes adag érték megadása kötelező!';
      // Collection terrain is optional, but if set, it must exist
      if (collectionTerrain && !terrainTypes.find(t => t.id === collectionTerrain)) {
        return 'Érvényes gyűjtési tereptípus megadása kötelező!';
      }
    }

    // Speciális Effektusok Validáció (Minden típushoz)
    if (specialEffects.length > 3) return 'Maximum 3 speciális effektus adható!';
    //if (specialEffects.some(effect => effect === '')) return 'Minden kiválasztott effekt érvényes kell legyen!';

    // Optional: If required item is set, check if it exists
    if (requiredItemId && !items.find(item => item.id === requiredItemId)) {
      return 'A szükséges tárgy nem található!';
    }

    // Additional validations as needed
    return null;
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setWeight(0);
    setGoldPrice(0);
    setSilverPrice(0);
    setCopperPrice(0);
    setType('Weapon');
    setDiceCount(1);
    setDiceType('d6');
    setDiceModifier(0);
    setAttack(0);
    setDefense(0);
    setComponents([]);
    setCraftingTime(1);
    setImageUrl('');
    setCraftingTerrain('');
    setSpecialAbilities(['']);
    setRarity('Common');
    setWearable(false);
    setCapacity(0);
    setAllowedItem1('');
    setAllowedItem2('');
    setAllowedItem3('');
    setSpecialEffects(['']);
    setRequiredItemId('');
    setIsUsable(false);
    setUsableInCombat(false);
    setServingValue(0);
    setCollectionTerrain('');
    setEditingId(null);
    setShowForm(false);
    setCurrentPage(1);
  };

  const saveItem = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    // Collect allowed items, excluding empty values
    const allowedItemsArray = [allowedItem1, allowedItem2, allowedItem3].filter(item => item !== '');

    const itemData: Partial<Item> = {
      name,
      description,
      weight,
      price: {
        gold: goldPrice,
        silver: silverPrice,
        copper: copperPrice
      },
      type,
      damage: (type === 'Weapon' || type === 'RangedWeapon') ? {
        count: diceCount,
        type: diceType,
        modifier: diceModifier
      } : undefined,
      attack: (type === 'Weapon' || type === 'RangedWeapon') ? attack : undefined,
      defense: (type === 'Armor' || type === 'Shield') ? defense : undefined,
      components: components.filter(c => c.itemId && c.quantity > 0),
      crafting_time: craftingTime,
      image_url: imageUrl || undefined,
      crafting_terrain: craftingTerrain || undefined,
      special_abilities: specialAbilities.filter(ability => ability.trim() !== ''),
      rarity,
      wearable,
      capacity: type === 'Storage' ? capacity : undefined,
      allowed_items: type === 'Storage' ? allowedItemsArray : undefined,
      special_effects: specialEffects.filter(effect => effect.trim() !== ''), // Minden típushoz
      required_item_id: type === 'Storage' ? (requiredItemId !== '' ? requiredItemId : undefined) : undefined,
      isUsable,
      usableInCombat,
      serving_value: type === 'Élelem' ? servingValue : undefined,
      collection_terrain: type === 'Élelem' ? (collectionTerrain !== '' ? collectionTerrain : undefined) : undefined
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Tárgy sikeresen frissítve!');
      } else {
        const { error } = await supabase
          .from('items')
          .insert([itemData]);

        if (error) throw error;
        setNotification('Új tárgy sikeresen létrehozva!');
      }

      resetForm();
      fetchItems();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editItem = (item: Item) => {
    setName(item.name);
    setDescription(item.description);
    setWeight(item.weight);
    setGoldPrice(item.price.gold);
    setSilverPrice(item.price.silver);
    setCopperPrice(item.price.copper);
    setType(item.type);
    if (item.damage) {
      setDiceCount(item.damage.count);
      setDiceType(item.damage.type);
      setDiceModifier(item.damage.modifier);
    }
    setAttack(item.attack || 0);
    setDefense(item.defense || 0);
    setComponents(item.components || []);
    setCraftingTime(item.crafting_time || 1);
    setImageUrl(item.image_url || '');
    setCraftingTerrain(item.crafting_terrain || '');
    setSpecialAbilities(item.special_abilities.length ? item.special_abilities : ['']);
    setRarity(item.rarity);
    setWearable(item.wearable || false);
    setCapacity(item.capacity || 0);
    setAllowedItem1(item.allowed_items && item.allowed_items[0] ? item.allowed_items[0] : '');
    setAllowedItem2(item.allowed_items && item.allowed_items[1] ? item.allowed_items[1] : '');
    setAllowedItem3(item.allowed_items && item.allowed_items[2] ? item.allowed_items[2] : '');
    setSpecialEffects(item.special_effects && item.special_effects.length ? item.special_effects : ['']);
    setRequiredItemId(item.required_item_id || '');
    setIsUsable(item.isUsable || false);
    setUsableInCombat(item.usableInCombat || false);
    setServingValue(item.serving_value || 0); // Élelemhez
    setCollectionTerrain(item.collection_terrain || ''); // Élelemhez
    setEditingId(item.id);
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Tárgy sikeresen törölve!');
      fetchItems();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Filtering and Sorting Logic
  const filteredAndSortedItems = useMemo(() => {
    let filteredItems = [...items];

    if (filterType) {
      filteredItems = filteredItems.filter(item => item.type === filterType);
    }

    if (sortField === 'name') {
      filteredItems.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return sortOrder === 'asc' ? -1 : 1;
        if (a.name.toLowerCase() > b.name.toLowerCase()) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (sortField === 'price') {
      // Compute total price (gold * 10000 + silver * 100 + copper)
      const computePrice = (item: Item) => item.price.gold * 10000 + item.price.silver * 100 + item.price.copper;

      filteredItems.sort((a, b) => {
        const priceA = computePrice(a);
        const priceB = computePrice(b);
        if (priceA < priceB) return sortOrder === 'asc' ? -1 : 1;
        if (priceA > priceB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredItems;
  }, [items, sortField, sortOrder, filterType]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center w-full">
          <h1 className="text-2xl font-bold text-white">Főmenü</h1>
        </div>

        {/* Sorting and Filtering Controls */}
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0 w-full">
          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-300 text-sm">Rendezés:</span>
            {/* By Name */}
            <button
              onClick={() => {
                if (sortField === 'name') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('name');
                  setSortOrder('asc');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center"
            >
              <span>ABC</span>
              {sortField === 'name' && sortOrder === 'asc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 10l5 5 5-5H5z" />
                </svg>
              )}
              {sortField === 'name' && sortOrder === 'desc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 10l-5-5-5 5h10z" />
                </svg>
              )}
            </button>
            {/* By Price */}
            <button
              onClick={() => {
                if (sortField === 'price') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('price');
                  setSortOrder('asc');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center"
            >
              <span>Ár</span>
              {sortField === 'price' && sortOrder === 'asc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 10l5 5 5-5H5z" />
                </svg>
              )}
              {sortField === 'price' && sortOrder === 'desc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 10l-5-5-5 5h10z" />
                </svg>
              )}
            </button>
          </div>

          {/* Filter by Type */}
          <div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1); // Reset page when filter changes
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg"
            >
              <option value="">Összes típus</option>
              {itemTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>{typeOption}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="w-full md:w-3/4 lg:w-1/2 mx-auto p-6">
        {/* Buttons Above Item List */}
        <div className="flex justify-between mb-4">
          <button
            onClick={() => navigate('/main-menu')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
          >
            ← Vissza a főmenübe
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            + Új tárgy létrehozása
          </button>
        </div>

        {/* New or Edited Item Form */}
        {showForm && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Tárgy szerkesztése' : 'Új tárgy létrehozása'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side Fields */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Név <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Típus <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ItemType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    {itemTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Rarity */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Ritkaság
                  </label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as RarityType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    {rarityTypes.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Wearable Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={wearable}
                    onChange={(e) => setWearable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <label className="text-white text-sm font-bold">
                    Viselhető
                  </label>
                </div>

                {/* Usable Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isUsable}
                    onChange={(e) => setIsUsable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <label className="text-white text-sm font-bold">
                    Használható
                  </label>
                </div>

                {/* Usable in Combat Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={usableInCombat}
                    onChange={(e) => setUsableInCombat(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <label className="text-white text-sm font-bold">
                    Harc közben használható
                  </label>
                </div>
              </div>

              {/* Right Side Fields */}
              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Súly (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Crafting Time */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Elkészítési idő (perc) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={craftingTime}
                    onChange={(e) => setCraftingTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="1"
                  />
                </div>

                {/* Price Fields */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Ár <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Gold */}
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-1">
                        Arany
                      </label>
                      <input
                        type="number"
                        value={goldPrice}
                        onChange={(e) => setGoldPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        min="0"
                      />
                    </div>
                    {/* Silver */}
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-1">
                        Ezüst
                      </label>
                      <input
                        type="number"
                        value={silverPrice}
                        onChange={(e) => setSilverPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        min="0"
                      />
                    </div>
                    {/* Copper */}
                    <div>
                      <label className="block text-gray-300 text-sm font-bold mb-1">
                        Réz
                      </label>
                      <input
                        type="number"
                        value={copperPrice}
                        onChange={(e) => setCopperPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Crafting Terrain */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Készítési terep
                  </label>
                  <select
                    value={craftingTerrain}
                    onChange={(e) => setCraftingTerrain(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">Bárhol készíthető</option>
                    {terrainTypes.map((terrain) => (
                      <option key={terrain.id} value={terrain.id}>
                        {terrain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Kép URL
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Description and Additional Fields */}
              <div className="md:col-span-2 space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Leírás <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    rows={3}
                  />
                </div>

                {/* Damage Dice Count */}
                {(type === 'Weapon' || type === 'RangedWeapon') && (
                  <>
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Sebzés kockák száma
                      </label>
                      <input
                        type="number"
                        value={diceCount}
                        onChange={(e) => setDiceCount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        min="1"
                      />
                    </div>

                    {/* Damage Dice Type */}
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Sebzés kocka típusa
                      </label>
                      <select
                        value={diceType}
                        onChange={(e) => setDiceType(e.target.value as DiceType)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      >
                        {diceTypes.map((dt) => (
                          <option key={dt} value={dt}>{dt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Damage Modifier */}
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Sebzés módosító
                      </label>
                      <input
                        type="number"
                        value={diceModifier}
                        onChange={(e) => setDiceModifier(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      />
                    </div>

                    {/* Attack Bonus */}
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Támadás bónusz
                      </label>
                      <input
                        type="number"
                        value={attack}
                        onChange={(e) => setAttack(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Defense */}
                {(type === 'Armor' || type === 'Shield') && (
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">
                      Védelem
                    </label>
                    <input
                      type="number"
                      value={defense}
                      onChange={(e) => setDefense(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Allowed Items and Additional Fields */}
              {type === 'Storage' && (
                <>
                  {/* Capacity */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Kapacitás (darab) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      min="1"
                    />
                  </div>

                  {/* Allowed Items */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Engedélyezett tárgyak
                    </label>
                    <div className="space-y-4">
                      {/* Item 1 */}
                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-1">
                          Tárgy 1
                        </label>
                        <select
                          value={allowedItem1}
                          onChange={(e) => setAllowedItem1(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        >
                          <option value="">Válassz tárgyat</option>
                          {availableItems
                            .filter(item => item.type !== 'Storage')
                            .map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Item 2 */}
                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-1">
                          Tárgy 2
                        </label>
                        <select
                          value={allowedItem2}
                          onChange={(e) => setAllowedItem2(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        >
                          <option value="">Válassz tárgyat</option>
                          {availableItems
                            .filter(item => item.type !== 'Storage' && item.id !== allowedItem1)
                            .map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Item 3 */}
                      <div>
                        <label className="block text-gray-300 text-sm font-bold mb-1">
                          Tárgy 3
                        </label>
                        <select
                          value={allowedItem3}
                          onChange={(e) => setAllowedItem3(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                        >
                          <option value="">Válassz tárgyat</option>
                          {availableItems
                            .filter(item => item.type !== 'Storage' && item.id !== allowedItem1 && item.id !== allowedItem2)
                            .map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">Maximum három tárgy választható ki.</p>
                  </div>

                  {/* Required Item */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Szükséges Tárgy az Előállításhoz
                    </label>
                    <select
                      value={requiredItemId}
                      onChange={(e) => setRequiredItemId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Nincs szükséges tárgy</option>
                      {availableItems
                        .filter(item => item.type !== 'Storage')
                        .map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <p className="text-gray-400 text-sm">Válassz egy tárgyat, ha szükséges</p>
                  </div>

                  {/* Special Effects */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Speciális effektek (max. 3)
                    </label>
                    {specialEffects.map((effect, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <select
                          value={effect}
                          onChange={(e) => {
                            const newEffects = [...specialEffects];
                            newEffects[index] = e.target.value;
                            setSpecialEffects(newEffects);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                        >
                          <option value="">Válassz varázslatot</option>
                          {specialEffectOptions.map((spellName) => (
                            <option key={spellName} value={spellName}>{spellName}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const newEffects = specialEffects.filter((_, i) => i !== index);
                            setSpecialEffects(newEffects.length ? newEffects : ['']);
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Törlés
                        </button>
                      </div>
                    ))}
                    {specialEffects.length < 3 && (
                      <button
                        onClick={() => setSpecialEffects([...specialEffects, ''])}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        + Új varázslat hozzáadása
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Élelem Specific Fields */}
              {type === 'Élelem' && (
                <>
                  {/* Serving Value */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Adag Értéke <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={servingValue}
                      onChange={(e) => setServingValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      min="1"
                      step="0.1"
                    />
                  </div>

                  {/* Collection Terrain */}
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Gyűjtési Tereptípus
                    </label>
                    <select
                      value={collectionTerrain}
                      onChange={(e) => setCollectionTerrain(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Bármely terepen</option>
                      {terrainTypes.map((terrain) => (
                        <option key={terrain.id} value={terrain.id}>
                          {terrain.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Special Effects for All Types */}
              <div className="md:col-span-2">
                <label className="block text-white text-sm font-bold mb-2">
                  Speciális effektek (max. 3)
                </label>
                {specialEffects.map((effect, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={effect}
                      onChange={(e) => {
                        const newEffects = [...specialEffects];
                        newEffects[index] = e.target.value;
                        setSpecialEffects(newEffects);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Válassz varázslatot</option>
                      {specialEffectOptions.map((spellName) => (
                        <option key={spellName} value={spellName}>{spellName}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const newEffects = specialEffects.filter((_, i) => i !== index);
                        setSpecialEffects(newEffects.length ? newEffects : ['']);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Törlés
                    </button>
                  </div>
                ))}
                {specialEffects.length < 3 && (
                  <button
                    onClick={() => setSpecialEffects([...specialEffects, ''])}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    + Új varázslat hozzáadása
                  </button>
                )}
              </div>

              {/* Components */}
              <div className="md:col-span-2">
                <h3 className="text-white text-lg font-bold mb-2">Komponensek (max. 3)</h3>
                {components.map((component, index) => (
                  <div key={index} className="flex gap-4 mb-4">
                    <select
                      value={component.itemId}
                      onChange={(e) => updateComponent(index, 'itemId', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Válassz komponenst</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={component.quantity}
                      onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value))}
                      min="1"
                      className="w-24 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <button
                      onClick={() => removeComponent(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Törlés
                    </button>
                  </div>
                ))}
                {components.length < 3 && (
                  <button
                    onClick={addComponent}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    + Komponens hozzáadása
                  </button>
                )}
              </div>

              {/* Special Abilities */}
              <div className="md:col-span-2">
                <h3 className="text-white text-lg font-bold mb-2">Különleges képességek</h3>
                {specialAbilities.map((ability, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={ability}
                      onChange={(e) => {
                        const newAbilities = [...specialAbilities];
                        newAbilities[index] = e.target.value;
                        setSpecialAbilities(newAbilities);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <button
                      onClick={() => {
                        const newAbilities = specialAbilities.filter((_, i) => i !== index);
                        setSpecialAbilities(newAbilities.length ? newAbilities : ['']);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Törlés
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setSpecialAbilities([...specialAbilities, ''])}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  + Új képesség
                </button>
              </div>

              {/* Saving and Cancel Buttons */}
              <div className="flex justify-end gap-4 md:col-span-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Mégse
                </button>
                <button
                  onClick={saveItem}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Tárgyak listája</h2>
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row items-center justify-between bg-gray-700 p-4 rounded-lg w-full"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={item.image_url || 'https://via.placeholder.com/50'}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="text-white font-bold">{item.name}</h3>
                    <p className="text-gray-400 text-sm">{item.type}</p>
                    <p className="text-gray-400 text-sm">
                      Viselhető: {item.wearable ? 'Igen' : 'Nem'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Használható: {item.isUsable ? 'Igen' : 'Nem'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Harc közben használható: {item.usableInCombat ? 'Igen' : 'Nem'}
                    </p>
                    {/* Price Display */}
                    <p className="text-gray-400 text-sm">
                      Ár: {item.price.gold} gold, {item.price.silver} silver, {item.price.copper} copper
                    </p>
                    {/* Speciális képességek */}
                    {item.special_abilities && item.special_abilities.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm">Különleges képességek:</p>
                        <ul className="list-disc list-inside text-gray-400 text-sm">
                          {item.special_abilities.map((ability, index) => (
                            <li key={index}>{ability}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Speciális effektek */}
                    {item.special_effects && item.special_effects.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm">Speciális effektek:</p>
                        <ul className="list-disc list-inside text-gray-400 text-sm">
                          {item.special_effects.map((effect, index) => (
                            <li key={index}>{effect}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Storage Specific Fields */}
                    {item.type === 'Storage' && (
                      <>
                        <p className="text-gray-400 text-sm">Kapacitás: {item.capacity}</p>
                        <p className="text-gray-400 text-sm">
                          Engedélyezett tárgy 1: {availableItems.find(i => i.id === item.allowed_items?.[0])?.name || 'Ismeretlen'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Engedélyezett tárgy 2: {availableItems.find(i => i.id === item.allowed_items?.[1])?.name || 'Ismeretlen'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Engedélyezett tárgy 3: {availableItems.find(i => i.id === item.allowed_items?.[2])?.name || 'Ismeretlen'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Szükséges tárgy: {availableItems.find(i => i.id === item.required_item_id)?.name || 'Nincs szükséges tárgy'}
                        </p>
                      </>
                    )}
                    {/* Élelem Specific Fields */}
                    {item.type === 'Élelem' && (
                      <>
                        <p className="text-gray-400 text-sm">
                          Adag Értéke: {item.serving_value}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Gyűjtési tereptípus: {item.collection_terrain ? (
                            terrainTypes.find(t => t.id === item.collection_terrain)?.name || 'Ismeretlen'
                          ) : 'Bármely terepen'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                  <button
                    onClick={() => editItem(item)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Szerkesztés
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Törlés
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 space-x-4">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 ${
                  currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Előző
              </button>
              <span className="text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 ${
                  currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Következő
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
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
    </div>
  );
};

export default NewItems;
