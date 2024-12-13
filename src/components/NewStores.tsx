import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { StoreData } from './types/interface'

interface Item {
  id: string;
  name: string;
  type: string;
}

const NewStores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [storeName, setStoreName] = useState('');
  const [initialInventory, setInitialInventory] = useState<{ itemId: string; quantity: number }[]>([]);
  const [cash, setCash] = useState({ gold: 0, silver: 0, copper: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
    fetchItems();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) {
      setNotification('Hiba történt a boltok betöltése közben!');
    } else {
      setStores(data || []);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('id, name, type').order('name');
    if (error) {
      setNotification('Hiba történt a tárgyak betöltése közben!');
    } else {
      setAvailableItems(data || []);
    }
  };

  const handleAddItem = () => {
    if (initialInventory.length < 15) {
      setInitialInventory([...initialInventory, { itemId: '', quantity: 1 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setInitialInventory(initialInventory.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
    const updatedInventory = [...initialInventory];
    updatedInventory[index] = { ...updatedInventory[index], [field]: value };
    setInitialInventory(updatedInventory);
  };

  const validateForm = (): string | null => {
    if (!storeName.trim()) return 'A bolt neve nem lehet üres.';
    for (const item of initialInventory) {
      if (!item.itemId) return 'Minden tárgyhoz ki kell választani egy elemet.';
      if (item.quantity <= 0) return 'A mennyiségnek pozitív számnak kell lennie.';
    }
    return null;
  };

  const resetForm = () => {
    setStoreName('');
    setInitialInventory([]);
    setCash({ gold: 0, silver: 0, copper: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newStore: Partial<StoreData> = {
        name: storeName.trim(),
        initial_inventory: initialInventory,
        cash,
        stock: [], // Üres készlet (maximum 150 tárgy)
      };

      if (editingId) {
        const { error } = await supabase.from('stores').update(newStore).eq('id', editingId);
        if (error) throw error;
        setNotification('Bolt sikeresen frissítve!');
      } else {
        const { error } = await supabase.from('stores').insert(newStore);
        if (error) throw error;
        setNotification('Új bolt sikeresen létrehozva!');
      }

      resetForm();
      fetchStores();
    } catch (err: any) {
      setError(err.message);
      setNotification('Hiba történt a bolt mentésekor!');
    } finally {
      setLoading(false);
    }
  };

  const editStore = (store: StoreData) => {
    setStoreName(store.name);
    setInitialInventory(store.initial_inventory);
    setCash(store.cash);
    setEditingId(store.id);
    setShowForm(true);
  };

  const deleteStore = async (id: string) => {
    try {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
      setNotification('Bolt sikeresen törölve!');
      fetchStores();
    } catch (err: any) {
      setNotification('Hiba történt a bolt törlésekor!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Boltok kezelése</h1>
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
              + Új bolt létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Bolt szerkesztése' : 'Új bolt létrehozása'}
              </h2>

              {error && <div className="text-red-500 mb-4">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-bold mb-2">Bolt neve</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bolt neve"
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Alap készlet (max. 15 tárgy)</h3>
                {initialInventory.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 mb-4">
                    <select
                      value={item.itemId}
                      onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      <option value="">Válassz tárgyat</option>
                      {availableItems.map((availableItem) => (
                        <option key={availableItem.id} value={availableItem.id}>
                          {availableItem.name} ({availableItem.type})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      min="1"
                      className="w-24 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Törlés
                    </button>
                  </div>
                ))}
                {initialInventory.length < 15 && (
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    + Tárgy hozzáadása
                  </button>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Készpénz készlet</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">Arany</label>
                    <input
                      type="number"
                      value={cash.gold}
                      onChange={(e) => setCash({ ...cash, gold: Number(e.target.value) })}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">Ezüst</label>
                    <input
                      type="number"
                      value={cash.silver}
                      onChange={(e) => setCash({ ...cash, silver: Number(e.target.value) })}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">Réz</label>
                    <input
                      type="number"
                      value={cash.copper}
                      onChange={(e) => setCash({ ...cash, copper: Number(e.target.value) })}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Mégse
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Boltok listája</h2>
            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div>
                    <h3 className="text-white font-bold">{store.name}</h3>
                    <p className="text-gray-400 text-sm">
                      Tárgyak száma: {store.initial_inventory.length}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Készpénz: {store.cash.gold} arany, {store.cash.silver} ezüst, {store.cash.copper} réz
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editStore(store)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteStore(store.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

export default NewStores;
