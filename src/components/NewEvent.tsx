// src/components/NewEvent.tsx

import React, { useState, useEffect } from 'react'; 
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Event, TreasureItem, EventType, Monster, Item } from './types/interface';

const NewEvent: React.FC = () => {
  const navigate = useNavigate();
  
  // State variables
  const [eventList, setEventList] = useState<Event[]>([]);
  const [monsterList, setMonsterList] = useState<Monster[]>([]);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('Harc');
  const [monsterId, setMonsterId] = useState<string>('');
  const [teleportX, setTeleportX] = useState<number>(0);
  const [teleportY, setTeleportY] = useState<number>(0);
  const [treasureItems, setTreasureItems] = useState<TreasureItem[]>(
    Array(10).fill({ itemId: '', dropChance: 0 })
  );
  const [shopName, setShopName] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [isOnce, setIsOnce] = useState(false); // Új állapotváltozó
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  // Constants
  const ITEMS_PER_PAGE = 5;
  const eventTypes: EventType[] = ['Harc', 'Teleport', 'Kincs', 'Bolt'];

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setRole(profileData?.role || 'user');
    };

    fetchUser();
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    fetchEvents();
    fetchMonsters();
    fetchItems();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        monster:monsters (
          name,
          type,
          difficulty
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      setNotification('Hiba az események betöltésekor!');
    } else {
      setEventList(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  const fetchMonsters = async () => {
    const { data, error } = await supabase
      .from('monsters')
      .select('id, name, type, difficulty')
      .order('name');

    if (error) {
      console.error('Error fetching monsters:', error);
    } else {
      setMonsterList(data || []);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItemList(data || []);
    }
  };

  // Form handling
  const resetForm = () => {
    setName('');
    setDescription('');
    setType('Harc');
    setMonsterId('');
    setTeleportX(0);
    setTeleportY(0);
    setTreasureItems(Array(10).fill({ itemId: '', dropChance: 0 }));
    setShopName('');
    setIsPermanent(false);
    setIsOnce(false); // Reset the new checkbox
    setProfileImageUrl('');
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = (): string | null => {
    if (!name) return 'A név megadása kötelező!';
    if (!description) return 'A leírás megadása kötelező!';
    
    switch (type) {
      case 'Harc':
        if (!monsterId) return 'Szörny kiválasztása kötelező!';
        break;
      case 'Teleport':
        if (teleportX < 0 || teleportX > 999) return 'Érvénytelen X koordináta!';
        if (teleportY < 0 || teleportY > 999) return 'Érvénytelen Y koordináta!';
        break;
      case 'Kincs':
        const hasValidTreasure = treasureItems.some(item => item.itemId && item.dropChance > 0);
        if (!hasValidTreasure) return 'Legalább egy kincset meg kell adni!';
        break;
      case 'Bolt':
        if (!shopName) return 'A bolt nevének megadása kötelező!';
        break;
    }

    return null;
  };

  const saveEvent = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    const eventData: Partial<Event> = {
      name,
      description,
      type,
      monster_id: type === 'Harc' ? monsterId : undefined,
      teleport_x: type === 'Teleport' ? teleportX : undefined,
      teleport_y: type === 'Teleport' ? teleportY : undefined,
      treasure_items: type === 'Kincs' ? treasureItems.filter(item => item.itemId && item.dropChance > 0) : undefined,
      shop_name: type === 'Bolt' ? shopName : undefined,
      is_permanent: isPermanent,
      is_once: isOnce, // Új mező hozzáadva
      profile_image_url: profileImageUrl || undefined
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Esemény sikeresen frissítve!');
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;
        setNotification('Új esemény sikeresen létrehozva!');
      }

      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Error saving event:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editEvent = (event: Event) => {
    setName(event.name);
    setDescription(event.description);
    setType(event.type);
    setMonsterId(event.monster_id || '');
    setTeleportX(event.teleport_x || 0);
    setTeleportY(event.teleport_y || 0);
    setTreasureItems(
      event.treasure_items 
        ? [...event.treasure_items, ...Array(10 - event.treasure_items.length).fill({ itemId: '', dropChance: 0 })]
        : Array(10).fill({ itemId: '', dropChance: 0 })
    );
    setShopName(event.shop_name || '');
    setIsPermanent(event.is_permanent);
    setIsOnce(event.is_once); // Állítsa be az isOnce értékét
    setProfileImageUrl(event.profile_image_url || '');
    setEditingId(event.id);
    setShowForm(true);
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Esemény sikeresen törölve!');
      fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedEvents = eventList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Események kezelése</h1>
        {user && (
          <div className="text-white text-sm text-right">
            <p>{user.email}</p>
            <p>Szerepkör: <span className="font-medium">{role}</span></p>
          </div>
        )}
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
              + Új esemény létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Esemény szerkesztése' : 'Új esemény létrehozása'}
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
                    placeholder="Esemény neve"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Típus <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {eventTypes.map((t) => (
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

                <div className="flex items-center">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={isPermanent}
                      onChange={(e) => setIsPermanent(e.target.checked)}
                      className="mr-2"
                    />
                    Permanens esemény
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={isOnce}
                      onChange={(e) => setIsOnce(e.target.checked)}
                      className="mr-2"
                    />
                    Csak egyszer teljesíthető karakterenként
                  </label>
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
                    placeholder="Esemény leírása"
                  />
                </div>

                {type === 'Harc' && (
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Szörny <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={monsterId}
                      onChange={(e) => setMonsterId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Válassz szörnyet</option>
                      {monsterList.map((monster) => (
                        <option key={monster.id} value={monster.id}>
                          {monster.name} ({monster.type} - {monster.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {type === 'Teleport' && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        X koordináta <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={teleportX}
                        onChange={(e) => setTeleportX(Number(e.target.value))}
                        min="0"
                        max="999"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Y koordináta <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={teleportY}
                        onChange={(e) => setTeleportY(Number(e.target.value))}
                        min="0"
                        max="999"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {type === 'Kincs' && (
                  <div className="md:col-span-2">
                    <h3 className="text-white text-lg font-bold mb-4">Kincsek (max. 10)</h3>
                    {treasureItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-white text-sm font-bold mb-2">
                            Tárgy {index + 1}
                          </label>
                          <select
                            value={item.itemId}
                            onChange={(e) => {
                              const newItems = [...treasureItems];
                              newItems[index].itemId = e.target.value;
                              setTreasureItems(newItems);
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
                              const newItems = [...treasureItems];
                              newItems[index].dropChance = Math.min(100, Math.max(0, Number(e.target.value)));
                              setTreasureItems(newItems);
                            }}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {type === 'Bolt' && (
                  <div className="md:col-span-2">
                    <label className="block text-white text-sm font-bold mb-2">
                      Bolt neve <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Bolt neve"
                    />
                  </div>
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
                  onClick={saveEvent}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Események listája</h2>
            <div className="space-y-4">
              {paginatedEvents.map((event: Event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={event.profile_image_url || 'https://via.placeholder.com/50'}
                      alt={event.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-white font-bold">{event.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {event.type}
                        {event.monster && ` - ${event.monster.name}`}
                        {event.type === 'Teleport' && ` (${event.teleport_x}, ${event.teleport_y})`}
                        {event.type === 'Bolt' && ` - ${event.shop_name}`}
                      </p>
                      {event.is_permanent && (
                        <p className="text-blue-400 text-sm">Permanens</p>
                      )}
                      {event.is_once && (
                        <p className="text-green-400 text-sm">Csak egyszer teljesíthető</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editEvent(event)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
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

export default NewEvent;
