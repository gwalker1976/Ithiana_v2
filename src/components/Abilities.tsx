import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Ability } from './types/interface';

const Abilities: React.FC = () => {
  const navigate = useNavigate();
  
  // State variables
  const [abilitiesList, setAbilitiesList] = useState<Ability[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [mainAttribute, setMainAttribute] = useState('');
  const [energyCost, setEnergyCost] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  
  // Damage state
  const [diceCount, setDiceCount] = useState(1);
  const [diceType, setDiceType] = useState<'d4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'>('d6');
  const [damageModifier, setDamageModifier] = useState(0);
  const [damageType, setDamageType] = useState('');
  const [range, setRange] = useState('');
  
  // Other state
  const [protectionType, setProtectionType] = useState('');
  const [defenseAmount, setDefenseAmount] = useState(0); // Új állapot a védelmi mértékhez
  const [duration, setDuration] = useState(0); // Új állapot az időtartamhoz
  const [restoreType, setRestoreType] = useState('');
  const [restoreAmount, setRestoreAmount] = useState(0);
  
  // Új állapot az "Erősítés" buffhoz
  const [attackAmount, setAttackAmount] = useState(0);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Constants
  const ITEMS_PER_PAGE = 5;
  const abilityTypes = ['Támadás', 'Védekezés', 'Gyógyítás', 'Használati', 'Erősítés']; // "Erősítés" hozzáadása
  const attributes = ['Erő', 'Ügyesség', 'Egészség', 'Elme', 'Bölcsesség', 'Karizma'];
  const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const damageTypes = ['Fizikai', 'Tűz', 'Víz', 'Levegő', 'Föld', 'Pszichikus', 'Üresség', 'Hang'];
  const ranges = ['Közeli', 'Közepes', 'Távoli'];
  const protectionTypes = ['Fizikai', 'Tűz', 'Víz', 'Levegő', 'Föld', 'Pszichikus', 'Üresség', 'Hang'];
  const restoreTypes = ['Életerő', 'Energia'];

  // Fetch abilities
  useEffect(() => {
    fetchAbilities();
  }, []);

  const fetchAbilities = async () => {
    const { data, error } = await supabase
      .from('class_abilities')
      .select('*')
      .order('name');

    if (error) {
      setNotification('Hiba a képességek betöltésekor');
    } else {
      setAbilitiesList(data || []);
      const total = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      setTotalPages(total);
    }
  };

  // Form handling
  const resetForm = () => {
    setName('');
    setDescription('');
    setType('');
    setMainAttribute('');
    setEnergyCost(0);
    setCooldown(0);
    setProfileImageUrl('');
    setDiceCount(1);
    setDiceType('d6');
    setDamageModifier(0);
    setDamageType('');
    setRange('');
    setProtectionType('');
    setDefenseAmount(0); // Reset defenseAmount
    setDuration(0); // Reset duration
    setRestoreType('');
    setRestoreAmount(0);
    setAttackAmount(0); // Reset attackIncrease
    setEditingId(null);
    setShowForm(false);
  };

  const saveAbility = async () => {
    const properties: any = {};

    if (type === 'Támadás') {
      properties.damage = {
        count: diceCount,
        type: diceType,
        modifier: damageModifier
      };
      properties.damageType = damageType;
      properties.range = range;
    } else if (type === 'Védekezés') {
      properties.protectionType = protectionType;
      if (protectionType === 'Fizikai') {
        properties.defenseAmount = defenseAmount; // Tároljuk a védelmi mértéket
      }
      properties.duration = duration; // Tároljuk az időtartamot minden védekezésnél
    } else if (type === 'Gyógyítás') {
      properties.restoreType = restoreType;
      properties.restoreAmount = restoreAmount;
    } else if (type === 'Erősítés') { // "Erősítés" típus kezelése
      properties.attackAmount = attackAmount;
      properties.duration = duration; // Tároljuk az időtartamot az "Erősítés" buffnál
    }

    const abilityData = {
      name,
      description,
      type,
      mainAttribute,
      energy_cost: energyCost,
      cooldown,
      profile_image_url: profileImageUrl,
      properties
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('class_abilities')
          .update(abilityData)
          .eq('id', editingId);

        if (error) throw error;
        setNotification('Képesség sikeresen frissítve!');
      } else {
        const { error } = await supabase
          .from('class_abilities')
          .insert([abilityData]);

        if (error) throw error;
        setNotification('Új képesség sikeresen létrehozva!');
      }

      resetForm();
      fetchAbilities();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  const editAbility = (ability: Ability) => {
    setName(ability.name);
    setDescription(ability.description);
    setType(ability.type);
    setMainAttribute(ability.mainAttribute);
    setEnergyCost(ability.energyCost);
    setCooldown(ability.cooldown);
    setProfileImageUrl(ability.profile_image_url || '');

    const props = ability.properties;
    if (props.damage) {
      setDiceCount(props.damage.count);
      setDiceType(props.damage.type);
      setDamageModifier(props.damage.modifier);
    }
    setDamageType(props.damageType || '');
    setRange(props.range || '');
    setProtectionType(props.protectionType || '');
    setDefenseAmount(props.defenseAmount || 0); // Beállítjuk a defenseAmount-ot
    setDuration(props.duration || 0); // Beállítjuk az duration-t
    setRestoreType(props.restoreType || '');
    setRestoreAmount(props.restoreAmount || 0);
    setAttackAmount(props.attackAmount || 0); // Beállítjuk az attackIncrease-ot

    setEditingId(ability.id);
    setShowForm(true);
  };

  const deleteAbility = async (id: string) => {
    try {
      const { error } = await supabase
        .from('class_abilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotification('Képesség sikeresen törölve!');
      fetchAbilities();
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-800 to-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-3xl font-extrabold text-white">Speciális Képességek</h1>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <button
              onClick={() => navigate('/main-menu')}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition transform hover:scale-105"
            >
              ← Vissza a főmenübe
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
            >
              + Új képesség létrehozása
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl mb-6 animate-fadeIn">
              <h2 className="text-2xl font-semibold text-white mb-6">
                {editingId ? 'Képesség szerkesztése' : 'Új képesség létrehozása'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Név <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Képesség neve"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Típus <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Válassz típust</option>
                    {abilityTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Fő tulajdonság <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mainAttribute}
                    onChange={(e) => setMainAttribute(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Válassz tulajdonságot</option>
                    {attributes.map((attr) => (
                      <option key={attr} value={attr}>{attr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Profilkép URL
                  </label>
                  <input
                    type="text"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-medium mb-1">
                    Leírás <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    rows={4}
                    placeholder="Képesség leírása"
                  />
                </div>

                {/* Támadás típus kezelése */}
                {type === 'Támadás' && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">
                          Kockák száma
                        </label>
                        <input
                          type="number"
                          value={diceCount}
                          onChange={(e) => setDiceCount(Number(e.target.value))}
                          min="1"
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">
                          Kocka típusa
                        </label>
                        <select
                          value={diceType}
                          onChange={(e) => setDiceType(e.target.value as any)}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        >
                          {diceTypes.map((dt) => (
                            <option key={dt} value={dt}>{dt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">
                          Módosító
                        </label>
                        <input
                          type="number"
                          value={damageModifier}
                          onChange={(e) => setDamageModifier(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Sebzés típusa
                      </label>
                      <select
                        value={damageType}
                        onChange={(e) => setDamageType(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="">Válassz típust</option>
                        {damageTypes.map((dt) => (
                          <option key={dt} value={dt}>{dt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Hatótáv
                      </label>
                      <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="">Válassz hatótávot</option>
                        {ranges.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Védekezés típus kezelése */}
                {type === 'Védekezés' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Védelem típusa
                      </label>
                      <select
                        value={protectionType}
                        onChange={(e) => setProtectionType(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="">Válassz típust</option>
                        {protectionTypes.map((pt) => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                    </div>

                    {protectionType === 'Fizikai' && (
                      <div className="md:col-span-2">
                        <label className="block text-white text-sm font-medium mb-1">
                          Védelmi mérték <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={defenseAmount}
                          onChange={(e) => setDefenseAmount(Number(e.target.value))}
                          min="0"
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          placeholder="Például: 50"
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Időtartam (kör)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Például: 3"
                      />
                    </div>
                  </>
                )}

                {/* Gyógyítás típus kezelése */}
                {type === 'Gyógyítás' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Gyógyítás típusa
                      </label>
                      <select
                        value={restoreType}
                        onChange={(e) => setRestoreType(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="">Válassz típust</option>
                        {restoreTypes.map((rt) => (
                          <option key={rt} value={rt}>{rt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Gyógyítás mértéke
                      </label>
                      <input
                        type="number"
                        value={restoreAmount}
                        onChange={(e) => setRestoreAmount(Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Például: 30"
                      />
                    </div>
                  </>
                )}

                {/* Erősítés típus kezelése */}
                {type === 'Erősítés' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Támadó érték növelése
                      </label>
                      <input
                        type="number"
                        value={attackAmount}
                        onChange={(e) => setAttackAmount(Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Például: 20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-white text-sm font-medium mb-1">
                        Időtartam (kör)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Például: 3"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Energia költség
                  </label>
                  <input
                    type="number"
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Várakozási idő (kör)
                  </label>
                  <input
                    type="number"
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition transform hover:scale-105"
                >
                  Mégse
                </button>
                <button
                  onClick={saveAbility}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
                >
                  {editingId ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold text-white mb-6">Képességek listája</h2>
            <div className="space-y-6">
              {abilitiesList
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((ability) => (
                  <div
                    key={ability.id}
                    className="flex flex-col md:flex-row items-center justify-between bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center space-x-6">
                      <img
                        src={ability.profile_image_url || 'https://via.placeholder.com/50'}
                        alt={ability.name}
                        className="w-16 h-16 rounded-lg object-cover border-2 border-gray-600"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-white">{ability.name}</h3>
                        <p className="text-gray-300 text-sm">
                          {ability.type} - {ability.mainAttribute}
                          {ability.properties.damage && 
                            ` - ${ability.properties.damage.count}${ability.properties.damage.type}+${ability.properties.damage.modifier}`}
                          {ability.type === 'Védekezés' && ability.properties.protectionType === 'Fizikai' && 
                            ` - Védelmi mérték: ${ability.properties.defenseAmount}`}
                          {ability.type === 'Védekezés' && ability.properties.duration && 
                            ` - Időtartam: ${ability.properties.duration} kör`}
                          {ability.type === 'Erősítés' && ability.properties.attackAmount && 
                            ` - Támadó növelés: +${ability.properties.attackAmount}`}
                          {ability.type === 'Erősítés' && ability.properties.duration && 
                            ` - Időtartam: ${ability.properties.duration} kör`}
                        </p>
                        <p className="text-gray-300 text-sm">
                          Energia: {ability.energyCost} | Várakozás: {ability.cooldown} kör
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                      <button
                        onClick={() => editAbility(ability)}
                        className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition transform hover:scale-105"
                      >
                        Szerkesztés
                      </button>
                      <button
                        onClick={() => deleteAbility(ability.id)}
                        className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition transform hover:scale-105"
                      >
                        Törlés
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-full ${
                    currentPage === 1
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  } transition`}
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-4 py-2 rounded-full ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-white hover:bg-gray-500'
                    } transition`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-full ${
                    currentPage === totalPages
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  } transition`}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
            <p className="text-white mb-6">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Abilities;