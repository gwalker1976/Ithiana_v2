// src/pages/GatheringLists.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Importáld az interfészeket
import { GatheringList, GatheringData, TerrainType, Item, Profile } from './types/interface';

const GatheringLists: React.FC = () => {
  const navigate = useNavigate();

  // State Variables
  const [gatheringLists, setGatheringLists] = useState<GatheringList[]>([]);
  const [terrains, setTerrains] = useState<TerrainType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [listName, setListName] = useState('');
  const [selectedTerrain, setSelectedTerrain] = useState<string>('');
  const [gatherings, setGatherings] = useState<GatheringData[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Constants
  const ITEMS_PER_PAGE = 5;

  // Fetch Data and User Role
  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Nem sikerült betölteni a felhasználói adatokat:', error);
          navigate('/');
          return;
        }

        const currentUser = data.user;
        if (!currentUser) {
          console.log('Nincs bejelentkezett felhasználó.');
          navigate('/');
          return;
        }

        setUser(currentUser);
        console.log('Bejelentkezett felhasználó:', currentUser.email);

        // Fetch role from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from<Profile>('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.error('Nem sikerült betölteni a szerepkört:', profileError);
          setRole('user');
        } else {
          setRole(profileData?.role || 'user');
          console.log('Felhasználó szerepköre:', profileData?.role || 'user');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, [navigate]);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && role !== 'admin') {
      navigate('/');
    }
  }, [loading, role, navigate]);

  // Fetch data only if user is admin
  useEffect(() => {
    if (role === 'admin') {
      fetchTerrains();
      fetchItems();
      fetchGatheringLists();
    }
  }, [role]);

  const fetchGatheringLists = async () => {
    const { data, error } = await supabase
      .from<GatheringList>('gathering_lists')
      .select(`
        id,
        name,
        terrain_id,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gathering lists:', error);
      setNotification('Hiba történt a lista betöltése során!');
    } else {
      setGatheringLists(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  const fetchTerrains = async () => {
    const { data, error } = await supabase
      .from<TerrainType>('terrains')
      .select(`
        id,
        name
      `)
      .order('name');

    if (error) {
      console.error('Error fetching terrains:', error);
      setNotification('Hiba történt a tereptípusok betöltése során!');
    } else {
      setTerrains(data || []);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from<Item>('items')
      .select(`
        id,
        name,
        collection_terrain
      `)
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
      setNotification('Hiba történt az elemek betöltése során!');
    } else {
      setItems(data || []);
    }
  };

  // Form Handling
  const resetForm = () => {
    setListName('');
    setSelectedTerrain('');
    setGatherings([]);
    setEditingListId(null);
    setShowForm(false);
  };

  const validateForm = (): string | null => {
    if (!listName) return 'A lista neve kötelező!';
    if (!selectedTerrain) return 'A tereptípus kiválasztása kötelező!';
    if (gatherings.length === 0) return 'Legalább egy gyűjtögetés szükséges!';
    for (let i = 0; i < gatherings.length; i++) {
      const gather = gatherings[i];
      if (!gather.item_id) return `A(z) ${i + 1}. gyűjtögetés elemének kiválasztása kötelező!`;
      if (gather.interval_start < 1 || gather.interval_start > 20)
        return `A(z) ${i + 1}. gyűjtögetés intervallum kezdete 1 és 20 között kell legyen!`;
      if (gather.interval_end < 1 || gather.interval_end > 20)
        return `A(z) ${i + 1}. gyűjtögetés intervallum vége 1 és 20 között kell legyen!`;
      if (gather.interval_start > gather.interval_end)
        return `A(z) ${i + 1}. gyűjtögetés intervallum kezdete nem lehet nagyobb, mint a vége!`;
    }
    return null;
  };

  const saveGatheringList = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    // Első lépés: beszúrni vagy frissíteni a gathering_list-et
    const listData = {
      name: listName,
      terrain_id: selectedTerrain,
    };

    try {
      let listId: string;

      if (editingListId) {
        // Ha szerkesztés, frissítsük a listát
        const { data, error } = await supabase
          .from('gathering_lists')
          .update(listData)
          .eq('id', editingListId)
          .select('id');

        if (error) throw error;
        listId = editingListId;
        setNotification('Lista sikeresen frissítve!');
      } else {
        // Ha új lista, beszúrjuk és megszerezzük az új azonosítót
        const { data, error } = await supabase
          .from('gathering_lists')
          .insert([listData])
          .select('id');

        if (error) throw error;
        listId = data[0].id;
        setNotification('Lista sikeresen létrehozva!');
      }

      // Második lépés: beszúrni vagy frissíteni a gatherings-eket
      if (listId) {
        // Ha szerkesztünk, először töröljük a meglévő gatherings-eket
        if (editingListId) {
          const { error: deleteError } = await supabase
            .from('gatherings')
            .delete()
            .eq('gathering_list_id', listId);

          if (deleteError) throw deleteError;
        }

        // Beszúrjuk az új gatherings-eket
        const gatheringsData = gatherings.map(gather => ({
          gathering_list_id: listId,
          item_id: gather.item_id,
          interval_start: gather.interval_start,
          interval_end: gather.interval_end,
        }));

        if (gatheringsData.length > 0) {
          const { error: insertError } = await supabase
            .from('gatherings')
            .insert(gatheringsData);

          if (insertError) throw insertError;
        }
      }

      // Végén visszaállítjuk az űrlapot és frissítjük a listát
      resetForm();
      fetchGatheringLists();
    } catch (error: any) {
      console.error('Error saving gathering list:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editGatheringList = async (list: GatheringList) => {
    setEditingListId(list.id);
    setListName(list.name);
    setSelectedTerrain(list.terrain_id);
    console.log('Editing List ID:', list.id);
    console.log('List Name:', list.name);
    console.log('Selected Terrain ID:', list.terrain_id);

    // Fetch gatherings for this list without aliasing
    const { data, error } = await supabase
      .from<GatheringData>('gatherings')
      .select(`
        id,
        gathering_list_id,
        item_id,
        interval_start,
        interval_end
      `)
      .eq('gathering_list_id', list.id)
      .order('interval_start');

    if (error) {
      console.error('Error fetching gatherings:', error);
      setNotification('Hiba történt a gyűjtögetések betöltése során!');
      return;
    }

    // Map the fetched gatherings to the Gathering interface
    const fetchedGatherings = data.map(gather => ({
      id: gather.id,
      gathering_list_id: gather.gathering_list_id,
      item_id: gather.item_id,
      interval_start: gather.interval_start,
      interval_end: gather.interval_end,
    }));

    console.log('Fetched Gatherings:', fetchedGatherings);

    setGatherings(fetchedGatherings);
    setShowForm(true);
  };

  const deleteGatheringList = async (id: string) => {
    try {
      // Töröljük a gatherings-eket automatikusan az ON DELETE CASCADE miatt
      const { error } = await supabase
        .from('gathering_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotification('Lista sikeresen törölve!');
      fetchGatheringLists();
    } catch (error: any) {
      console.error('Error deleting gathering list:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Gathering Handling
  const addGathering = () => {
    if (gatherings.length >= 20) {
      setNotification('Maximum 20 gyűjtögetés engedélyezett!');
      return;
    }
    setGatherings([...gatherings, { id: '', item_id: '', interval_start: 1, interval_end: 20 }]);
  };

  const updateGathering = (index: number, field: keyof GatheringData, value: any) => {
    const updatedGatherings = [...gatherings];
    updatedGatherings[index] = { ...updatedGatherings[index], [field]: value };
    setGatherings(updatedGatherings);
  };

  const removeGathering = (index: number) => {
    const updatedGatherings = [...gatherings];
    updatedGatherings.splice(index, 1);
    setGatherings(updatedGatherings);
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedGatheringLists = gatheringLists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Gyűjtögetés Listák Szerkesztő</h1>
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
              + Új lista létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingListId ? 'Lista szerkesztése' : 'Új lista létrehozása'}
              </h2>

              <div className="mb-6">
                <label className="block text-white text-sm font-bold mb-2">
                  Lista neve <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lista neve"
                />
              </div>

              <div className="mb-6">
                <label className="block text-white text-sm font-bold mb-2">
                  Tereptípus <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTerrain}
                  onChange={(e) => setSelectedTerrain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Válassz tereptípust</option>
                  {terrains.map((terrain) => (
                    <option key={terrain.id} value={terrain.id}>
                      {terrain.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Gyűjtögetések (max. 20)</h3>
                {gatherings.map((gathering, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-white font-semibold">Gyűjtögetés {index + 1}</h4>
                      <button
                        onClick={() => removeGathering(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        Törlés
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Elem <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={gathering.item_id}
                          onChange={(e) => updateGathering(index, 'item_id', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Válassz elemet</option>
                          {items
                            .filter(item => item.collection_terrain === selectedTerrain)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Intervallum kezdete (1-20) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={gathering.interval_start}
                          onChange={(e) => updateGathering(index, 'interval_start', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Intervallum vége (1-20) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={gathering.interval_end}
                          onChange={(e) => updateGathering(index, 'interval_end', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {gatherings.length < 20 && (
                  <button
                    onClick={addGathering}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    + Gyűjtögetés hozzáadása
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Mégse
                </button>
                <button
                  onClick={saveGatheringList}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingListId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Gyűjtögetés Listák</h2>
            <div className="space-y-4">
              {paginatedGatheringLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div>
                    <h3 className="text-white font-bold">{list.name}</h3>
                    <p className="text-gray-300">
                      Tereptípus: {terrains.find(t => t.id === list.terrain_id)?.name || 'Ismeretlen'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editGatheringList(list)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteGatheringList(list.id)}
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

export default GatheringLists;
