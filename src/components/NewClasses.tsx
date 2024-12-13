import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Class, Ability} from './types/interface'

type AttributeType = 'Erő' | 'Ügyesség' | 'Egészség' | 'Elme' | 'Bölcsesség' | 'Karizma';

const NewClass: React.FC = () => {
  const navigate = useNavigate();
  const [classList, setClassList] = useState<Class[]>([]);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [abilities, setAbilities] = useState<Ability[]>(
    Array(10).fill({ name: '', level: 1 })
  );
  const [baseHp, setBaseHp] = useState(0);
  const [hpPerLevel, setHpPerLevel] = useState(0);
  const [energyAttribute, setEnergyAttribute] = useState<AttributeType>('Elme');
  const [baseEnergy, setBaseEnergy] = useState(0);
  const [energyPerLevel, setEnergyPerLevel] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);

  const ITEMS_PER_PAGE = 5;
  const attributes: AttributeType[] = ['Erő', 'Ügyesség', 'Egészség', 'Elme', 'Bölcsesség', 'Karizma'];

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

  useEffect(() => {
    fetchClasses();
    fetchSpecies();
    fetchAbilities();
  }, []);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a kasztok betöltésekor');
    } else {
      setClassList(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  const fetchSpecies = async () => {
    const { data, error } = await supabase
      .from('species')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a fajok betöltésekor');
    } else {
      setSpeciesList(data || []);
    }
  };

  const fetchAbilities = async () => {
    const { data, error } = await supabase
      .from('class_abilities')
      .select('name')
      .order('name');

    if (error) {
      setNotification('Hiba a képességek betöltésekor');
    } else {
      setAvailableAbilities(data?.map(a => a.name) || []);
    }
  };

  const validateForm = (): string | null => {
    if (!name) return 'A név megadása kötelező!';
    if (selectedSpecies.length === 0) return 'Legalább egy faj kiválasztása kötelező!';
    if (baseHp <= 0) return 'Az alap életerő nem lehet 0 vagy negatív!';
    if (hpPerLevel <= 0) return 'A szintenkénti életerő nem lehet 0 vagy negatív!';
    if (baseEnergy <= 0) return 'Az alap energia nem lehet 0 vagy negatív!';
    if (energyPerLevel <= 0) return 'A szintenkénti energia nem lehet 0 vagy negatív!';
    return null;
  };

  const saveClass = async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotification(validationError);
      return;
    }

    const classData = {
      name,
      profile_image_url: profileImageUrl,
      species: selectedSpecies,
      abilities: abilities.filter(a => a.name !== ''),
      base_hp: baseHp,
      hp_per_level: hpPerLevel,
      energy_attribute: energyAttribute,
      base_energy: baseEnergy,
      energy_per_level: energyPerLevel
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Kaszt sikeresen frissítve!');
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([classData]);

        if (error) throw error;
        setNotification('Új kaszt sikeresen létrehozva!');
      }

      resetForm();
      fetchClasses();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const resetForm = () => {
    setName('');
    setProfileImageUrl('');
    setSelectedSpecies([]);
    setAbilities(Array(10).fill({ name: '', level: 1 }));
    setBaseHp(0);
    setHpPerLevel(0);
    setEnergyAttribute('Elme');
    setBaseEnergy(0);
    setEnergyPerLevel(0);
    setEditingId(null);
    setShowForm(false);
  };

  const editClass = (classData: Class) => {
    setName(classData.name);
    setProfileImageUrl(classData.profile_image_url || '');
    setSelectedSpecies(classData.species);
    setAbilities(classData.abilities.length ? 
      [...classData.abilities, ...Array(10 - classData.abilities.length).fill({ name: '', level: 1 })] :
      Array(10).fill({ name: '', level: 1 })
    );
    setBaseHp(classData.base_hp);
    setHpPerLevel(classData.hp_per_level);
    setEnergyAttribute(classData.energy_attribute);
    setBaseEnergy(classData.base_energy);
    setEnergyPerLevel(classData.energy_per_level);
    setEditingId(classData.id);
    setShowForm(true);
  };

  const deleteClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Kaszt sikeresen törölve!');
      fetchClasses();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const toggleSpeciesSelection = (speciesId: string) => {
    setSelectedSpecies(prev =>
      prev.includes(speciesId) ? prev.filter(id => id !== speciesId) : [...prev, speciesId]
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Kasztok kezelése</h1>
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
              + Új kaszt létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Kaszt szerkesztése' : 'Új kaszt létrehozása'}
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
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="Kaszt neve"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Profilkép URL
                  </label>
                  <input
                    type="text"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Alap életerő <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={baseHp}
                    onChange={(e) => setBaseHp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Életerő/szint <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={hpPerLevel}
                    onChange={(e) => setHpPerLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Energia tulajdonság <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={energyAttribute}
                    onChange={(e) => setEnergyAttribute(e.target.value as AttributeType)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    {attributes.map((attr) => (
                      <option key={attr} value={attr}>{attr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Alap energia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={baseEnergy}
                    onChange={(e) => setBaseEnergy(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Energia/szint <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={energyPerLevel}
                    onChange={(e) => setEnergyPerLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Elérhető fajok</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {speciesList.map((species) => (
                    <label key={species.id} className="flex items-center gap-2 text-white">
                      <input
                        type="checkbox"
                        checked={selectedSpecies.includes(species.id)}
                        onChange={() => toggleSpeciesSelection(species.id)}
                      />
                      {species.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">Speciális képességek (max. 10)</h3>
                {abilities.map((ability, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Képesség {index + 1}
                      </label>
                      <select
                        value={ability.name}
                        onChange={(e) => {
                          const newAbilities = [...abilities];
                          newAbilities[index].name = e.target.value;
                          setAbilities(newAbilities);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      >
                        <option value="">Válassz képességet</option>
                        {availableAbilities.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">
                        Szint
                      </label>
                      <input
                        type="number"
                        value={ability.level}
                        onChange={(e) => {
                          const newAbilities = [...abilities];
                          newAbilities[index].level = Math.max(1, Math.min(20, Number(e.target.value)));
                          setAbilities(newAbilities);
                        }}
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                      />
                    </div>
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
                  onClick={saveClass}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Kasztok listája</h2>
            <div className="space-y-4">
              {classList
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((classData) => (
                  <div
                    key={classData.id}
                    className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={classData.profile_image_url || 'https://via.placeholder.com/50'}
                        alt={classData.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="text-white font-bold">{classData.name}</h3>
                        <p className="text-gray-400 text-sm">
                          HP: {classData.base_hp} + {classData.hp_per_level}/szint
                        </p>
                        <p className="text-gray-400 text-sm">
                          Energia ({classData.energy_attribute}): {classData.base_energy} + {classData.energy_per_level}/szint
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editClass(classData)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                      >
                        Szerkesztés
                      </button>
                      <button
                        onClick={() => deleteClass(classData.id)}
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(page)}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewClass;