import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { TerrainType, EncounterList } from './types/interface.ts';

import {
  Trees, Droplet, Wind, Cloud, Sun, Waves, Snowflake, 
  TreePine, Flower2, Sprout, Tent, Castle, Mountain,
  TreeDeciduous, Palmtree, Wheat, Footprints, Compass, Map,
  Pyramid, Building, Factory, Home, Warehouse, Landmark,
  Shell, Tornado
} from 'lucide-react';

const availableIcons = {
  Mountain: Mountain,
  Trees: Trees,
  Droplet: Droplet,
  Wind: Wind,
  Cloud: Cloud,
  Sun: Sun,
  Waves: Waves,
  Snowflake: Snowflake,
  TreePine: TreePine,
  Flower2: Flower2,
  Sprout: Sprout,
  Tent: Tent,
  Castle: Castle,
  TreeDeciduous: TreeDeciduous,
  Palmtree: Palmtree,
  Wheat: Wheat,
  Footprints: Footprints,
  Compass: Compass,
  Map: Map,
  Pyramid: Pyramid,
  Building: Building,
  Factory: Factory,
  Home: Home,
  Warehouse: Warehouse,
  Landmark: Landmark,
  Shell: Shell,
  Tornado: Tornado
};

const availableColors = [
  { name: 'Szürke', value: 'gray' },
  { name: 'Piros', value: 'red' },
  { name: 'Zöld', value: 'green' },
  { name: 'Kék', value: 'blue' },
  { name: 'Sárga', value: 'yellow' },
  { name: 'Lila', value: 'purple' },
  { name: 'Rózsaszín', value: 'pink' },
  { name: 'Narancs', value: 'orange' },
  { name: 'Barna', value: 'brown' },
  { name: 'Türkiz', value: 'teal' }
];

const NewTerrain: React.FC = () => {
  const navigate = useNavigate();
  
  // State variables
  const [terrainList, setTerrainList] = useState<TerrainType[]>([]);
  const [name, setName] = useState('');
  const [descriptions, setDescriptions] = useState<string[]>(Array(5).fill(''));
  const [selectedIcon, setSelectedIcon] = useState<string>('Mountain');
  const [selectedColor, setSelectedColor] = useState<string>('gray');
  const [useCustomImage, setUseCustomImage] = useState<boolean>(false);
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [traversable, setTraversable] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  
  // New state variables for Encounter Lists
  const [encounterLists, setEncounterLists] = useState<EncounterList[]>([]);
  const [selectedEncounterList, setSelectedEncounterList] = useState<string>('');
  const [encounterPercentage, setEncounterPercentage] = useState<number>(0);

  // Constants
  const ITEMS_PER_PAGE = 5;

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Nem sikerült betölteni a felhasználói adatokat:', error);
        return;
      }

      const user = data.user;
      setUser(user);

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Nem sikerült betölteni a szerepkört:', profileError);
        } else {
          setRole(profileData?.role || 'user');
        }
      }
    };

    fetchUser();
  }, []);

  // Fetch terrains and encounter lists
  useEffect(() => {
    fetchTerrains();
    fetchEncounterLists();
  }, []);

  const fetchTerrains = async () => {
    const { data, error } = await supabase
      .from('terrains')
      .select(`
        *,
        encounter_lists (name)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching terrains:', error);
      setNotification('Hiba a tereptípusok betöltésekor!');
    } else {
      setTerrainList(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  const fetchEncounterLists = async () => {
    const { data, error } = await supabase
      .from('encounter_lists')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching encounter lists:', error);
      setNotification('Hiba az Encounter listák betöltésekor!');
    } else {
      setEncounterLists(data || []);
    }
  };

  // Form handling
  const resetForm = () => {
    setName('');
    setDescriptions(Array(5).fill(''));
    setSelectedIcon('Mountain');
    setSelectedColor('gray');
    setUseCustomImage(false);
    setCustomImageUrl('');
    setTraversable(true);
    setSelectedEncounterList('');
    setEncounterPercentage(0);
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = (): string | null => {
    if (!name) return 'A név megadása kötelező!';
    if (!descriptions[0]) return 'Legalább egy leírás megadása kötelező!';
    if (useCustomImage) {
      if (!customImageUrl) return 'Kérjük, adjon meg egy kép URL-t!';
      const urlPattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-zA-Z\\d_]*)?$','i'); // fragment locator
      if (!urlPattern.test(customImageUrl)) return 'Érvénytelen URL formátum!';
    }
    if (!selectedEncounterList) return 'Encounter lista kiválasztása kötelező!';
    if (encounterPercentage < 0 || encounterPercentage > 100) return 'Encounter használat százalékának 0-100 között kell lennie!';
    return null;
  };

  const saveTerrain = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    const terrainData: Partial<TerrainType> = {
      name,
      descriptions: descriptions.filter(desc => desc !== ''),
      color: selectedColor,
      traversable,
      use_custom_image: useCustomImage,
      custom_image_url: useCustomImage ? customImageUrl : undefined,
      icon: useCustomImage ? undefined : selectedIcon,
      encounter_list_id: selectedEncounterList,
      encounter_percentage: encounterPercentage,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('terrains')
          .update(terrainData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Tereptípus sikeresen frissítve!');
      } else {
        const { error } = await supabase
          .from('terrains')
          .insert([terrainData]);

        if (error) throw error;
        setNotification('Új tereptípus sikeresen létrehozva!');
      }

      resetForm();
      fetchTerrains();
    } catch (error: any) {
      console.error('Error saving terrain:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editTerrain = (terrain: TerrainType) => {
    setName(terrain.name);
    setDescriptions([...terrain.descriptions, ...Array(5 - terrain.descriptions.length).fill('')]);
    setSelectedIcon(terrain.icon || 'Mountain');
    setSelectedColor(terrain.color);
    setUseCustomImage(terrain.use_custom_image);
    setCustomImageUrl(terrain.custom_image_url || '');
    setTraversable(terrain.traversable);
    setSelectedEncounterList(terrain.encounter_list_id || '');
    setEncounterPercentage(terrain.encounter_percentage || 0);
    setEditingId(terrain.id);
    setShowForm(true);
  };

  const deleteTerrain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('terrains')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Tereptípus sikeresen törölve!');
      fetchTerrains();
    } catch (error: any) {
      console.error('Error deleting terrain:', error);
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedTerrains = terrainList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const IconComponent = ({ terrain }: { terrain: TerrainType }) => {
    if (terrain.use_custom_image && terrain.custom_image_url) {
      return <img src={terrain.custom_image_url} alt={terrain.name} className="w-6 h-6 object-cover rounded" />;
    } else {
      const Icon = availableIcons[terrain.icon as keyof typeof availableIcons];
      return Icon ? <Icon className="w-6 h-6" /> : null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Tereptípusok kezelése</h1>
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
              + Új tereptípus létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Tereptípus szerkesztése' : 'Új tereptípus létrehozása'}
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
                    placeholder="Tereptípus neve"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-white text-sm font-bold mb-2">
                    Ikon Forrás <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center font-bold text-white">
                      <input
                        type="radio"
                        name="iconSource"
                        value="icon"
                        checked={!useCustomImage}
                        onChange={() => setUseCustomImage(false)}
                        className="form-radio text-blue-500"
                      />
                      <span className="ml-2">Előre definiált Ikon</span>
                    </label>
                    <label className="flex items-center font-bold text-white">
                      <input
                        type="radio"
                        name="iconSource"
                        value="custom"
                        checked={useCustomImage}
                        onChange={() => setUseCustomImage(true)}
                        className="form-radio text-blue-500"
                      />
                      <span className="ml-2">Saját Kép URL</span>
                    </label>
                  </div>
                </div>

                {!useCustomImage ? (
                  <div className="mb-4">
                    <label className="block text-white text-sm font-bold mb-2">
                      Ikon <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(availableIcons).map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-white text-sm font-bold mb-2">
                      Kép URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.png"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Szín <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-white text-sm font-bold mb-2">
                    <input
                      type="checkbox"
                      checked={traversable}
                      onChange={(e) => setTraversable(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-500"
                    />
                    <span>Átjárható terep</span>
                  </label>
                </div>

                {/* Új EncounterList mezők */}
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Encounter Lista <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEncounterList}
                    onChange={(e) => setSelectedEncounterList(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Válassz Encounter Listát --</option>
                    {encounterLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Encounter Használat (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={encounterPercentage}
                    onChange={(e) => setEncounterPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Leírások (max. 5)</h3>
                {descriptions.map((description, index) => (
                  <div key={index} className="mb-4">
                    <label className="block text-white text-sm font-bold mb-2">
                      Leírás {index + 1} {index === 0 && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index] = e.target.value;
                        setDescriptions(newDescriptions);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder={`Leírás ${index + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Mégse
                </button>
                <button
                  onClick={saveTerrain}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Tereptípusok listája</h2>
            <div className="space-y-4">
              {paginatedTerrains.map((terrain) => (
                <div
                  key={terrain.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 bg-${terrain.color}-500 rounded-lg`}>
                      <IconComponent terrain={terrain} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{terrain.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {terrain.descriptions[0]}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {terrain.traversable ? 'Átjárható' : 'Nem átjárható'}
                      </p>
                      {terrain.encounter_lists && (
                        <p className="text-gray-400 text-sm">
                          Encounter Lista: {terrain.encounter_lists.name} ({terrain.encounter_percentage}%)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editTerrain(terrain)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteTerrain(terrain.id)}
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

export default NewTerrain;
