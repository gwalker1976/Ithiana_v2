// src/components/NewMonsters.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Monster, Item, MonsterType, DifficultyLevel, DiceType } from './types/interface';

const NewMonsters: React.FC = () => {
  const navigate = useNavigate();
  
  // State variables
  const [monsterList, setMonsterList] = useState<Monster[]>([]);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<MonsterType>('Humanoid');
  const [healthDiceCount, setHealthDiceCount] = useState(1);
  const [healthDiceType, setHealthDiceType] = useState<DiceType>('d8');
  const [healthModifier, setHealthModifier] = useState(0);
  const [attack, setAttack] = useState(0);
  const [defense, setDefense] = useState(0);
  const [damageDiceCount, setDamageDiceCount] = useState(1);
  const [damageDiceType, setDamageDiceType] = useState<DiceType>('d6');
  const [damageModifier, setDamageModifier] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Közepes');
  const [description, setDescription] = useState('');
  
  // Loot állapot inline típussal
  const [loot, setLoot] = useState<Array<{ itemId: string; dropChance: number }>>(
    Array.from({ length: 5 }, () => ({ itemId: '', dropChance: 0 }))
  );
  
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // **Új state változók a pénzérték tartományokhoz**
  const [goldMin, setGoldMin] = useState<number | ''>('');
  const [goldMax, setGoldMax] = useState<number | ''>('');
  const [silverMin, setSilverMin] = useState<number | ''>('');
  const [silverMax, setSilverMax] = useState<number | ''>('');
  const [copperMin, setCopperMin] = useState<number | ''>('');
  const [copperMax, setCopperMax] = useState<number | ''>('');

  // Constants
  const ITEMS_PER_PAGE = 5;
  const monsterTypes: MonsterType[] = ['Zöldbőrű', 'Élőholt', 'Humanoid', 'Óriás', 'Borzalom', 'Aberráció'];
  const difficultyLevels: DifficultyLevel[] = ['Könnyű', 'Közepes', 'Nehéz', 'Halálos', 'Legendás'];
  const diceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

  // Fetch data on component mount
  useEffect(() => {
    fetchMonsters();
    fetchItems();
  }, []);

  // Fetch monsters from the database
  const fetchMonsters = async () => {
    const { data, error } = await supabase
      .from<Monster>('monsters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monsters:', error);
      setNotification('Hiba történt a szörnyek betöltésekor!');
    } else {
      setMonsterList(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  // Fetch items from the database
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from<Item>('items')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
      setNotification('Hiba történt a tárgyak betöltésekor!');
    } else {
      setItemList(data || []);
    }
  };

  // Reset the form to default values
  const resetForm = () => {
    setName('');
    setType('Humanoid');
    setHealthDiceCount(1);
    setHealthDiceType('d8');
    setHealthModifier(0);
    setAttack(0);
    setDefense(0);
    setDamageDiceCount(1);
    setDamageDiceType('d6');
    setDamageModifier(0);
    setDifficulty('Közepes');
    setDescription('');
    setLoot(Array.from({ length: 5 }, () => ({ itemId: '', dropChance: 0 })));
    setProfileImageUrl('');
    setEditingId(null);
    setShowForm(false);

    // **Új pénzérték tartományok visszaállítása**
    setGoldMin('');
    setGoldMax('');
    setSilverMin('');
    setSilverMax('');
    setCopperMin('');
    setCopperMax('');
  };

  // Validate the form inputs
  const validateForm = (): string | null => {
    if (!name) return 'A szörny neve kötelező!';
    if (!type) return 'A szörny típusa kötelező!';
    if (!description) return 'A leírás kötelező!';
    if (healthDiceCount < 1) return 'Az életerő kockák száma pozitív kell legyen!';
    if (attack < 0) return 'A támadás nem lehet negatív!';
    if (defense < 0) return 'A védelem nem lehet negatív!';
    if (damageDiceCount < 1) return 'A sebzés kockák száma pozitív kell legyen!';

    // **Új pénzérték tartomány validáció**
    if (
      (goldMin !== '' && goldMax !== '' && goldMin > goldMax) ||
      (silverMin !== '' && silverMax !== '' && silverMin > silverMax) ||
      (copperMin !== '' && copperMax !== '' && copperMin > copperMax)
    ) {
      return 'A minimum értékek nem lehetnek nagyobbak a maximum értékeknél.';
    }

    return null;
  };

  // Save or update the monster
  const saveMonster = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    // **Monster Data Objektum létrehozása a különálló cash mezőkkel**
    const monsterData: Partial<Monster> = {
      name,
      type,
      health: {
        count: healthDiceCount,
        type: healthDiceType,
        modifier: healthModifier
      },
      attack,
      defense,
      damage: {
        count: damageDiceCount,
        type: damageDiceType,
        modifier: damageModifier
      },
      difficulty,
      description,
      loot: loot.filter(l => l.itemId && l.dropChance > 0),
      profile_image_url: profileImageUrl || null,
      // **Cash mezők hozzáadása, ha értékek vannak kitöltve**
      gold_min: goldMin !== '' ? (goldMin as number) : undefined,
      gold_max: goldMax !== '' ? (goldMax as number) : undefined,
      silver_min: silverMin !== '' ? (silverMin as number) : undefined,
      silver_max: silverMax !== '' ? (silverMax as number) : undefined,
      copper_min: copperMin !== '' ? (copperMin as number) : undefined,
      copper_max: copperMax !== '' ? (copperMax as number) : undefined,
    };

    try {
      if (editingId) {
        // Update existing monster
        const { error } = await supabase
          .from('monsters')
          .update(monsterData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Szörny sikeresen frissítve!');
      } else {
        // Create new monster
        const { error } = await supabase
          .from('monsters')
          .insert([monsterData]);

        if (error) throw error;
        setNotification('Szörny sikeresen létrehozva!');
      }

      resetForm();
      fetchMonsters();
    } catch (error: any) {
      console.error('Error saving monster:', error);
      setNotification(`Hiba történt: ${error.message}`);
    }
  };

  // Edit an existing monster
  const editMonster = (monster: Monster) => {
    setName(monster.name);
    setType(monster.type);
    setHealthDiceCount(monster.health.count);
    setHealthDiceType(monster.health.type);
    setHealthModifier(monster.health.modifier);
    setAttack(monster.attack);
    setDefense(monster.defense);
    setDamageDiceCount(monster.damage.count);
    setDamageDiceType(monster.damage.type);
    setDamageModifier(monster.damage.modifier);
    setDifficulty(monster.difficulty);
    setDescription(monster.description);
    
    // **Cash mezők állapot beállítása**
    setGoldMin(monster.gold_min ?? '');
    setGoldMax(monster.gold_max ?? '');
    setSilverMin(monster.silver_min ?? '');
    setSilverMax(monster.silver_max ?? '');
    setCopperMin(monster.copper_min ?? '');
    setCopperMax(monster.copper_max ?? '');

    // **Loot kezelése**
    const currentLoot = monster.loot ?? [];
    const additionalLootCount = Math.max(5 - currentLoot.length, 0);
    const additionalLoot = Array.from({ length: additionalLootCount }, () => ({ itemId: '', dropChance: 0 }));
    setLoot([...currentLoot, ...additionalLoot]);

    setProfileImageUrl(monster.profile_image_url || '');
    setEditingId(monster.id);
    setShowForm(true);
  };

  // Delete a monster
  const deleteMonster = async (id: string) => {
    try {
      const { error } = await supabase
        .from('monsters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Szörny sikeresen törölve!');
      fetchMonsters();
    } catch (error: any) {
      console.error('Error deleting monster:', error);
      setNotification(`Hiba történt: ${error.message}`);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedMonsters = monsterList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Szörnyek kezelése</h1>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => navigate('/main-menu')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
            >
              ← Vissza a főmenübe
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              + Új szörny létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Szörny szerkesztése' : 'Új szörny létrehozása'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Név <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Szörny neve"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Típus <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MonsterType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monsterTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Profilkép URL
                  </label>
                  <input
                    type="text"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Nehézségi szint <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {difficultyLevels.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-bold mb-2">
                    Leírás <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Szörny leírása"
                  />
                </div>
              </div>

              {/* **Új Pénzérték Tartomány Szekció** */}
              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Pénzérték Tartomány (nem kötelező)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Arany */}
                  <div>
                    <label className="block text-gray-300">Arany Minimum</label>
                    <input
                      type="number"
                      value={goldMin}
                      onChange={(e) => setGoldMin(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300">Arany Maximum</label>
                    <input
                      type="number"
                      value={goldMax}
                      onChange={(e) => setGoldMax(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div></div> {/* Üres cella */}

                  {/* Ezüst */}
                  <div>
                    <label className="block text-gray-300">Ezüst Minimum</label>
                    <input
                      type="number"
                      value={silverMin}
                      onChange={(e) => setSilverMin(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300">Ezüst Maximum</label>
                    <input
                      type="number"
                      value={silverMax}
                      onChange={(e) => setSilverMax(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div></div> {/* Üres cella */}

                  {/* Réz */}
                  <div>
                    <label className="block text-gray-300">Réz Minimum</label>
                    <input
                      type="number"
                      value={copperMin}
                      onChange={(e) => setCopperMin(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300">Réz Maximum</label>
                    <input
                      type="number"
                      value={copperMax}
                      onChange={(e) => setCopperMax(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div></div> {/* Üres cella */}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Életerő kockák száma <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={healthDiceCount}
                    onChange={(e) => setHealthDiceCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Életerő kocka típusa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={healthDiceType}
                    onChange={(e) => setHealthDiceType(e.target.value as DiceType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {diceTypes.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Életerő módosító
                  </label>
                  <input
                    type="number"
                    value={healthModifier}
                    onChange={(e) => setHealthModifier(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Támadás <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={attack}
                    onChange={(e) => setAttack(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Védelem <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={defense}
                    onChange={(e) => setDefense(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Sebzés kockák száma <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={damageDiceCount}
                    onChange={(e) => setDamageDiceCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Sebzés kocka típusa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={damageDiceType}
                    onChange={(e) => setDamageDiceType(e.target.value as DiceType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {diceTypes.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Sebzés módosító
                  </label>
                  <input
                    type="number"
                    value={damageModifier}
                    onChange={(e) => setDamageModifier(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Zsákmány mező */}
              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Zsákmány (max. 5)</h3>
                {loot.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Tárgy {index + 1}
                      </label>
                      <select
                        value={item.itemId}
                        onChange={(e) => {
                          const newLoot = loot.map((lootItem, i) =>
                            i === index ? { ...lootItem, itemId: e.target.value } : lootItem
                          );
                          setLoot(newLoot);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Válassz tárgyat</option>
                        {itemList.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Esély (%)
                      </label>
                      <input
                        type="number"
                        value={item.dropChance}
                        onChange={(e) => {
                          const newLoot = loot.map((lootItem, i) =>
                            i === index ? { ...lootItem, dropChance: Number(e.target.value) } : lootItem
                          );
                          setLoot(newLoot);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Mégse
                </button>
                <button
                  onClick={saveMonster}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Szörnyek listája</h2>
            <div className="space-y-4">
              {paginatedMonsters.map((monster) => (
                <div
                  key={monster.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={monster.profile_image_url || 'https://via.placeholder.com/50'}
                      alt={monster.name}
                      className="w-36 h-36 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-white font-bold">{monster.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {monster.type} - {monster.difficulty}
                      </p>
                      <p className="text-gray-400 text-sm">
                        HP: {monster.health.count}{monster.health.type}
                        {monster.health.modifier > 0 && `+${monster.health.modifier}`}
                        {monster.health.modifier < 0 && monster.health.modifier}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Sebzés: {monster.damage.count}{monster.damage.type}
                        {monster.damage.modifier > 0 && `+${monster.damage.modifier}`}
                        {monster.damage.modifier < 0 && monster.damage.modifier}
                      </p>
                      {/* **Cash Range Megjelenítése** */}
                      {(monster.gold_min !== undefined || monster.gold_max !== undefined ||
                       monster.silver_min !== undefined || monster.silver_max !== undefined ||
                       monster.copper_min !== undefined || monster.copper_max !== undefined) && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-sm">Pénzérték Tartomány:</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {monster.gold_min !== undefined && monster.gold_max !== undefined && (
                              <li>Arany: {monster.gold_min} - {monster.gold_max}</li>
                            )}
                            {monster.silver_min !== undefined && monster.silver_max !== undefined && (
                              <li>Ezüst: {monster.silver_min} - {monster.silver_max}</li>
                            )}
                            {monster.copper_min !== undefined && monster.copper_max !== undefined && (
                              <li>Réz: {monster.copper_min} - {monster.copper_max}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editMonster(monster)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteMonster(monster.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === 1
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-white hover:bg-gray-500'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === totalPages
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <p className="text-white mb-4">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Rendben
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewMonsters;
