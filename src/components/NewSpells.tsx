// src/components/Spells.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Spell, TerrainType, Item } from './types/interface';

const NewSpells: React.FC = () => {
  const navigate = useNavigate();
  const [spells, setSpells] = useState<Spell[]>([]);
  const [items, setItems] = useState<Item[]>([]); // Tárgyak betöltése

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState(''); // Leírás mező
  const [range, setRange] = useState(0);
  const [duration, setDuration] = useState<'azonnali' | 'perc'>('azonnali');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [type, setType] = useState<'Általános' | 'Idézés' | 'Okozás' | 'Jóslás' | 'Gyógyítás' | 'Védelem'>('Általános');
  const [summonedItemId, setSummonedItemId] = useState<string>(''); // Megidézendő tárgy ID
  const [energyCost, setEnergyCost] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>(''); // Új állapot a kép URL-jéhez
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sorting and Filtering
  const [sortField, setSortField] = useState<'name' | 'range' | 'duration' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  // Varázslattípusok
  const spellTypes = ['Általános', 'Idézés', 'Okozás', 'Jóslás', 'Gyógyítás', 'Védelem'];

  // Betöltés
  useEffect(() => {
    fetchSpells();
    fetchItems(); // Tárgyak betöltése
  }, []);

  const fetchSpells = async () => {
    const { data, error } = await supabase.from('spells').select('*');

    if (error) {
      console.error('Hiba a varázslatok betöltésekor:', error);
      setNotification('Hiba a varázslatok betöltésekor.');
    } else {
      setSpells(data as Spell[]);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('*').order('name');

    if (error) {
      console.error('Hiba a tárgyak betöltésekor:', error);
      setNotification('Hiba a tárgyak betöltésekor.');
    } else {
      setItems(data as Item[]);
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setDescription('');
    setRange(0);
    setDuration('azonnali');
    setDurationMinutes(0);
    setType('Általános');
    setSummonedItemId('');
    setEnergyCost(0);
    setImageUrl(''); // Reseteljük az imageUrl állapotot
    setEditingId(null);
    setShowForm(false);
  };

  // Save spell
  const saveSpell = async () => {
    // Validáció
    if (!name || !description || range < 0 || !type) {
      setNotification('Kérlek, töltsd ki az összes kötelező mezőt.');
      return;
    }

    if (duration === 'perc' && durationMinutes < 0) {
      setNotification('A hatóidő nem lehet negatív.');
      return;
    }

    if (duration === 'perc' && durationMinutes === 0) {
      // Ha a perc értéke 0, automatikusan 'azonnali'-re váltunk
      setDuration('azonnali');
      setDurationMinutes(0);
    }

    // Ha a típus 'Idézés', akkor meg kell adni a megidézendő tárgyat
    if (type === 'Idézés' && !summonedItemId) {
      setNotification('Kérlek, válassz egy megidézendő tárgyat.');
      return;
    }

    const spellData: Partial<Spell> = {
      name,
      description,
      range,
      duration,
      duration_minutes: duration === 'perc' ? durationMinutes : null,
      type,
      summoned_item_id: type === 'Idézés' ? summonedItemId : null,
      energy_cost: energyCost,
      image_url: imageUrl || null, // Hozzáadjuk az image_url mezőt
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('spells').update(spellData).eq('id', editingId);
        if (error) throw error;
        setNotification('Varázslat sikeresen frissítve!');
      } else {
        const { error } = await supabase.from('spells').insert([spellData]);
        if (error) throw error;
        setNotification('Új varázslat sikeresen létrehozva!');
      }

      resetForm();
      fetchSpells();
    } catch (error: any) {
      console.error('Hiba a varázslat mentésekor:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Edit spell
  const editSpell = (spell: Spell) => {
    setName(spell.name);
    setDescription(spell.description);
    setRange(spell.range);
    setDuration(spell.duration);
    setDurationMinutes(spell.duration_minutes || 0);
    setType(spell.type);
    setSummonedItemId(spell.summoned_item_id || '');
    setEnergyCost(spell.energy_cost);
    setImageUrl(spell.image_url || ''); // Betöltjük az image_url-t
    setEditingId(spell.id);
    setShowForm(true);
  };

  // Delete spell
  const deleteSpell = async (id: string) => {
    try {
      const { error } = await supabase.from('spells').delete().eq('id', id);
      if (error) throw error;
      setNotification('Varázslat sikeresen törölve!');
      fetchSpells();
    } catch (error: any) {
      console.error('Hiba a varázslat törlésekor:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Sorting and Filtering
  const filteredAndSortedSpells = useMemo(() => {
    let filtered = [...spells];

    if (filterType) {
      filtered = filtered.filter(spell => spell.type === filterType);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'range') {
        comparison = a.range - b.range;
      } else if (sortField === 'duration') {
        // Összehasonlítás a duration és duration_minutes alapján
        const aDuration = a.duration === 'perc' ? a.duration_minutes || 0 : 0;
        const bDuration = b.duration === 'perc' ? b.duration_minutes || 0 : 0;
        comparison = aDuration - bDuration;
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [spells, sortField, sortOrder, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSpells.length / ITEMS_PER_PAGE);

  const paginatedSpells = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedSpells.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedSpells, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Helper: Map item IDs to names for easy lookup
  const itemIdToNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    items.forEach(item => {
      map[item.id] = item.name;
    });
    return map;
  }, [items]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Varázslatok kezelése</h1>

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
              <span>Név</span>
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
            {/* By Range */}
            <button
              onClick={() => {
                if (sortField === 'range') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('range');
                  setSortOrder('asc');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center"
            >
              <span>Hatótáv</span>
              {sortField === 'range' && sortOrder === 'asc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 10l5 5 5-5H5z" />
                </svg>
              )}
              {sortField === 'range' && sortOrder === 'desc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 10l-5-5-5 5h10z" />
                </svg>
              )}
            </button>
            {/* By Duration */}
            <button
              onClick={() => {
                if (sortField === 'duration') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('duration');
                  setSortOrder('asc');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center"
            >
              <span>Hatóidő</span>
              {sortField === 'duration' && sortOrder === 'asc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 10l5 5 5-5H5z" />
                </svg>
              )}
              {sortField === 'duration' && sortOrder === 'desc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 10l-5-5-5 5h10z" />
                </svg>
              )}
            </button>
            {/* By Type */}
            <button
              onClick={() => {
                if (sortField === 'type') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('type');
                  setSortOrder('asc');
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center"
            >
              <span>Típus</span>
              {sortField === 'type' && sortOrder === 'asc' && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 10l5 5 5-5H5z" />
                </svg>
              )}
              {sortField === 'type' && sortOrder === 'desc' && (
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
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg"
            >
              <option value="">Összes típus</option>
              {spellTypes.map((spellType) => (
                <option key={spellType} value={spellType}>
                  {spellType}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="w-full md:w-3/4 lg:w-1/2 mx-auto p-6">
        {/* Buttons Above Spell List */}
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
            + Új varázslat létrehozása
          </button>
        </div>

        {/* New or Edited Spell Form */}
        {showForm && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Varázslat szerkesztése' : 'Új varázslat létrehozása'}
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
                    onChange={(e) =>
                      setType(e.target.value as 'Általános' | 'Idézés' | 'Okozás' | 'Jóslás' | 'Gyógyítás' | 'Védelem')
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">Válassz egy típust</option>
                    {spellTypes.map((spellType) => (
                      <option key={spellType} value={spellType}>
                        {spellType}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Range */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Hatótáv (méter) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={range}
                    onChange={(e) => setRange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="0"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Hatóidő <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => {
                      const selectedDuration = e.target.value as 'azonnali' | 'perc';
                      setDuration(selectedDuration);
                      if (selectedDuration === 'azonnali') {
                        setDurationMinutes(0); // Reset minutes when 'azonnali' is selected
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="azonnali">Azonnali</option>
                    <option value="perc">Perc</option>
                  </select>
                </div>

                {/* Duration Minutes - Only show if duration is 'perc' */}
                {duration === 'perc' && (
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">
                      Hatóidő (perc) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => {
                        const minutes = Number(e.target.value);
                        setDurationMinutes(minutes);
                        if (minutes === 0) {
                          setDuration('azonnali'); // Switch to 'azonnali' if minutes are 0
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      min="0"
                      step="1"
                    />
                  </div>
                )}

                {/* Energy Cost */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Energia költség <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="0"
                  />
                </div>

                {/* Summoned Item - Only for 'Idézés' */}
                {type === 'Idézés' && (
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">
                      Megidézendő tárgy <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={summonedItemId}
                      onChange={(e) => setSummonedItemId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Válassz egy tárgyat</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Image URL */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Kép URL-je
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Right Side Fields */}
              <div className="space-y-4">
                {/* További mezők hozzáadhatók itt */}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-white text-sm font-bold mb-2">
                  Leírás <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  rows={3}
                ></textarea>
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
                  onClick={saveSpell}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spell List */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Varázslatok listája</h2>
          <div className="space-y-4">
            {paginatedSpells.map((spell) => (
              <div
                key={spell.id}
                className="flex flex-col md:flex-row items-center justify-between bg-gray-700 p-4 rounded-lg w-full"
              >
                <div className="flex items-center space-x-4">
                  {/* Kép megjelenítése */}
                  <img
                    src={spell.image_url || 'https://via.placeholder.com/50'}
                    alt={spell.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="text-white font-bold">{spell.name}</h3>
                    <p className="text-gray-400 text-sm">Hatótáv: {spell.range} méter</p>
                    <p className="text-gray-400 text-sm">
                      Hatóidő: {spell.duration === 'azonnali' ? 'Azonnali' : `${spell.duration_minutes} perc`}
                    </p>
                    <p className="text-gray-400 text-sm">Típus: {spell.type}</p>
                    <p className="text-gray-400 text-sm">Energia költség: {spell.energy_cost}</p>
                    {spell.type === 'Idézés' && (
                      <p className="text-gray-400 text-sm">
                        Megidézendő tárgy: {spell.summoned_item_id ? (itemIdToNameMap[spell.summoned_item_id] || 'Ismeretlen') : 'Nincs megadva'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                  <button
                    onClick={() => editSpell(spell)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Szerkesztés
                  </button>
                  <button
                    onClick={() => deleteSpell(spell.id)}
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

export default NewSpells;
