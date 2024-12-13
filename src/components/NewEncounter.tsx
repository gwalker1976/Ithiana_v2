import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { EncounterList, Encounter} from './types/interface'

// Interface Definitions
interface Event {
  id: string;
  name: string;
}



const RandomEncounterEditor: React.FC = () => {
  const navigate = useNavigate();

  // State Variables
  const [encounterLists, setEncounterLists] = useState<EncounterList[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [listName, setListName] = useState('');
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Constants
  const ITEMS_PER_PAGE = 5;

  // Fetch Data
  useEffect(() => {
    fetchEncounterLists();
    fetchEvents();
  }, []);

  const fetchEncounterLists = async () => {
    const { data, error } = await supabase
      .from<EncounterList>('encounter_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching encounter lists:', error);
      setNotification('Hiba történt a lista betöltése során!');
    } else {
      setEncounterLists(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from<Event>('events')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching events:', error);
      setNotification('Hiba történt az események betöltése során!');
    } else {
      setEvents(data || []);
    }
  };

  // Form Handling
  const resetForm = () => {
    setListName('');
    setEncounters([]);
    setEditingListId(null);
    setShowForm(false);
  };

  const validateForm = (): string | null => {
    if (!listName) return 'A lista neve kötelező!';
    if (encounters.length === 0) return 'Legalább egy encounter szükséges!';
    for (let i = 0; i < encounters.length; i++) {
      const enc = encounters[i];
      if (!enc.event_Id) return `Az ${i + 1}. encounter eseménye kötelező!`;
      if (enc.intervalStart < 1 || enc.intervalStart > 20) return `Az ${i + 1}. encounter intervalum kezdete 1 és 20 között kell legyen!`;
      if (enc.intervalEnd < 1 || enc.intervalEnd > 20) return `Az ${i + 1}. encounter intervalum vége 1 és 20 között kell legyen!`;
      if (enc.intervalStart > enc.intervalEnd) return `Az ${i + 1}. encounter intervalum kezdete nem lehet nagyobb, mint a vége!`;
    }
    return null;
  };

  const saveEncounterList = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    // Első lépés: beszúrni vagy frissíteni a encounter_list-et
    const listData = {
      name: listName,
    };

    try {
      let listId: string;

      if (editingListId) {
        // Ha szerkesztés, frissítsük a listát
        const { data, error } = await supabase
          .from('encounter_lists')
          .update(listData)
          .eq('id', editingListId);

        if (error) throw error;
        listId = editingListId;
        setNotification('Lista sikeresen frissítve!');
      } else {
        // Ha új lista, beszúrjuk és megszerezzük az új azonosítót
        const { data, error } = await supabase
          .from('encounter_lists')
          .insert([listData])
          .select('id');

        if (error) throw error;
        listId = data[0].id;
        setNotification('Lista sikeresen létrehozva!');
      }

      // Második lépés: beszúrni vagy frissíteni az encounter-eket
      if (listId) {
        // Ha szerkesztünk, először töröljük a meglévő encounter-eket
        if (editingListId) {
          const { error: deleteError } = await supabase
            .from('encounters')
            .delete()
            .eq('encounter_list_id', listId);

          if (deleteError) throw deleteError;
        }

        // Beszúrjuk az új encounter-eket
        const encountersData = encounters.map(enc => ({
          encounter_list_id: listId,
          event_id: enc.event_Id,
          interval_start: enc.intervalStart,
          interval_end: enc.intervalEnd,
        }));

        if (encountersData.length > 0) {
          const { error: insertError } = await supabase
            .from('encounters')
            .insert(encountersData);

          if (insertError) throw insertError;
        }
      }

      // Végén visszaállítjuk az űrlapot és frissítjük a listát
      resetForm();
      fetchEncounterLists();
    } catch (error: any) {
      console.error('Error saving encounter list:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editEncounterList = async (list: EncounterList) => {
    setEditingListId(list.id);
    setListName(list.name);

    // Fetch encounters for this list
    const { data, error } = await supabase
      .from<Encounter>('encounters')
      .select('*')
      .eq('encounter_list_id', list.id)
      .order('interval_start');

    if (error) {
      console.error('Error fetching encounters:', error);
      setNotification('Hiba történt az encounter-ek betöltése során!');
      return;
    }

    // Map the fetched encounters to the Encounter interface
    const fetchedEncounters = data.map(enc => ({
      id: enc.id,
      event_Id: enc.event_id,
      intervalStart: enc.interval_start,
      intervalEnd: enc.interval_end,
    }));

    setEncounters(fetchedEncounters);
    setShowForm(true);
  };

  const deleteEncounterList = async (id: string) => {
    try {
      // Töröljük az encounter-eket automatikusan az ON DELETE CASCADE miatt
      const { error } = await supabase
        .from('encounter_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotification('Lista sikeresen törölve!');
      fetchEncounterLists();
    } catch (error: any) {
      console.error('Error deleting encounter list:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Encounter Handling
  const addEncounter = () => {
    if (encounters.length >= 20) {
      setNotification('Maximum 20 encounter engedélyezett!');
      return;
    }
    setEncounters([...encounters, { id: '', event_Id: '', intervalStart: 1, intervalEnd: 20 }]);
  };

  const updateEncounter = (index: number, field: keyof Encounter, value: any) => {
    const updatedEncounters = [...encounters];
    updatedEncounters[index] = { ...updatedEncounters[index], [field]: value };
    setEncounters(updatedEncounters);
  };

  const removeEncounter = (index: number) => {
    const updatedEncounters = [...encounters];
    updatedEncounters.splice(index, 1);
    setEncounters(updatedEncounters);
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedEncounterLists = encounterLists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Random Encounter Szerkesztő</h1>
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
                <h3 className="text-white text-lg font-bold mb-4">Encounter-ek (max. 20)</h3>
                {encounters.map((encounter, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-white font-semibold">Encounter {index + 1}</h4>
                      <button
                        onClick={() => removeEncounter(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        Törlés
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Esemény <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={encounter.event_Id}
                          onChange={(e) => updateEncounter(index, 'event_Id', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Válassz eseményt</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Intervalum kezdete (1-20) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={encounter.intervalStart}
                          onChange={(e) => updateEncounter(index, 'intervalStart', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">
                          Intervalum vége (1-20) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={encounter.intervalEnd}
                          onChange={(e) => updateEncounter(index, 'intervalEnd', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {encounters.length < 20 && (
                  <button
                    onClick={addEncounter}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    + Encounter hozzáadása
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
                  onClick={saveEncounterList}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingListId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Encounter Listák</h2>
            <div className="space-y-4">
              {paginatedEncounterLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div>
                    <h3 className="text-white font-bold">{list.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editEncounterList(list)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteEncounterList(list.id)}
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

export default RandomEncounterEditor;
