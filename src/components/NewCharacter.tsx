import React, { useState, useEffect } from 'react'; 
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { CirclePlus, CircleMinus } from 'lucide-react';
import { CharacterData } from './types/interface';

type AttributeKeys = 'Erő' | 'Ügyesség' | 'Egészség' | 'Elme' | 'Bölcsesség' | 'Karizma';

const NewCharacter: React.FC = () => {
  const [characterName, setCharacterName] = useState('');
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [characterList, setCharacterList] = useState<CharacterData[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [selectedCharacterDetails, setSelectedCharacterDetails] = useState<CharacterData | null>(null);
  const [attributes, setAttributes] = useState<Record<AttributeKeys, number>>({
    Erő: 9,
    Ügyesség: 9,
    Egészség: 9,
    Elme: 9,
    Bölcsesség: 9,
    Karizma: 9,
  });

  const [remainingPoints, setRemainingPoints] = useState(27);
  const navigate = useNavigate();

  // Paginációhoz szükséges állapotváltozók
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [totalPages, setTotalPages] = useState(1);

  const calculateBonus = (value: number): string => {
    if (value <= 9) return '-1';
    if (value <= 11) return '+0';
    if (value <= 13) return '+1';
    return '+2';
  };

  const cost = (value: number) => {
    if (value <= 11) return 1;
    if (value <= 14) return 2;
    return 3;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        console.error('Nincs bejelentkezett felhasználó:', error);
        navigate('/main-menu');
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

  const fetchSpecies = async () => {
    const { data, error } = await supabase.from('species').select('*');
    if (error) {
      console.error('Hiba a fajok betöltésekor:', error);
    } else {
      setSpeciesList(data || []);
    }
  };

  const fetchClasses = async (speciesId: string) => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .contains('species', [speciesId]);
    if (error) {
      console.error('Hiba a kasztok betöltésekor:', error);
    } else {
      setClassList(data || []);
    }
  };

  const fetchSkills = async (classId: string) => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .contains('classes', [classId]);

    if (error) {
      console.error('Hiba a skillek betöltésekor:', error);
    } else {
      setSkills(data || []);
    }
  };

  const fetchCharacters = async () => {
    let query = supabase
      .from('characters')
      .select(`
        *,
        profile:profiles (
          email
        )
      `);

    if (role !== 'admin') {
      query = query.eq('profile_id', user?.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Hiba a karakterek betöltésekor:', error.message, error.details);
    } else {
      const charactersWithOwnerEmail = data?.map((character: any) => ({
        ...character,
        ownerEmail: character.profile?.email,
      }));
      setCharacterList((charactersWithOwnerEmail as CharacterData[]) || []);

      // Teljes oldalszám kiszámítása
      const total = Math.ceil((charactersWithOwnerEmail?.length || 0) / itemsPerPage);
      setTotalPages(total);
    }
  };

  useEffect(() => {
    fetchSpecies();
  }, []);

  useEffect(() => {
    if (user && role) {
      fetchCharacters();
    }
  }, [user, role]);

  const selectSpecies = (speciesId: string) => {
    setSelectedSpecies(speciesId);
    setSelectedClass(null);
    fetchClasses(speciesId);
  };

  const selectClass = (classId: string) => {
    setSelectedClass(classId);
    fetchSkills(classId);
  };

  const increaseAttribute = (attribute: AttributeKeys) => {
    const current = attributes[attribute];
    const next = current + 1;

    if (next > 15) return;

    const costToAdd = cost(next);
    if (remainingPoints < costToAdd) return;

    setAttributes((prev) => ({
      ...prev,
      [attribute]: next,
    }));

    setRemainingPoints((prev) => prev - cost(next));
  };

  const decreaseAttribute = (attribute: AttributeKeys) => {
    const current = attributes[attribute];
    const prevValue = current - 1;

    if (prevValue < 9) return;

    setAttributes((prev) => ({
      ...prev,
      [attribute]: prevValue,
    }));

    setRemainingPoints((prev) => prev + cost(current));
  };

  const saveCharacter = async () => {
    if (!characterName || !selectedSpecies || !selectedClass || remainingPoints !== 0) {
      setNotification('A karakter neve, faja, kasztja, és pontos pontelosztás kötelező!');
      return;
    }

    const characterData: Omit<CharacterData, 'id' | 'ownerEmail'> = {
      profile_id: user.id,
      name: characterName,
      species: speciesList.find((species) => species.id === selectedSpecies)?.name,
      class: classList.find((cls) => cls.id === selectedClass)?.name,
      attributes,
      skills: skills.map((skill) => skill.name),
    };

    let result;
    if (editingCharacterId) {
      // Meglévő karakter frissítése
      const { data, error } = await supabase
        .from('characters')
        .update(characterData)
        .eq('id', editingCharacterId);

      result = { data, error };
    } else {
      // Új karakter mentése
      const { data, error } = await supabase.from('characters').insert([characterData]);
      result = { data, error };
    }

    const { data, error } = result;

    if (error) {
      console.error('Hiba a karakter mentésekor:', error);
      setNotification('Hiba történt a karakter mentésekor!');
    } else {
      console.log('Karakter sikeresen mentve:', data);
      setNotification('Karakter sikeresen mentve!');
      resetForm();
      fetchCharacters(); // Lista frissítése mentés után
    }
  };

  const resetForm = () => {
    setCharacterName('');
    setSelectedSpecies(null);
    setSelectedClass(null);
    setAttributes({
      Erő: 9,
      Ügyesség: 9,
      Egészség: 9,
      Elme: 9,
      Bölcsesség: 9,
      Karizma: 9,
    });
    setRemainingPoints(27);
    setShowForm(false);
    setEditingCharacterId(null);
  };

  const viewCharacterDetails = (characterId: string) => {
    console.log('Karakter részleteinek megtekintése:', characterId);
    const character = characterList.find((c) => c.id === characterId);
    if (character) {
      setSelectedCharacterDetails(character);
    }
  };

  const modifyCharacter = async (characterId: string) => {
    if (role !== 'admin') {
      setNotification('Csak az adminok módosíthatják a karaktereket.');
      return;
    }

    console.log('Karakter módosítása:', characterId);
    // Karakter adatainak lekérése
    const { data: characterData, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (error) {
      console.error('Hiba a karakter adatainak betöltésekor:', error);
      setNotification('Hiba történt a karakter adatainak betöltésekor!');
      return;
    }

    // Űrlap mezők kitöltése a karakter adataival
    setCharacterName(characterData.name);
    const speciesId =
      speciesList.find((species) => species.name === characterData.species)?.id || null;
    setSelectedSpecies(speciesId);
    if (speciesId) {
      await fetchClasses(speciesId);
    }
    const classId =
      classList.find((cls) => cls.name === characterData.class)?.id || null;
    setSelectedClass(classId);
    if (classId) {
      await fetchSkills(classId);
    }
    setAttributes(characterData.attributes);
    setRemainingPoints(0); // Beállítjuk a hátralevő pontokat 0-ra módosításkor
    setEditingCharacterId(characterId);
    setShowForm(true);
  };

  const deleteCharacter = async (characterId: string) => {
    console.log('Karakter törlése:', characterId);
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (error) {
      console.error('Hiba a karakter törlésekor:', error);
      setNotification('Hiba történt a karakter törlésekor!');
    } else {
      setNotification('Karakter sikeresen törölve!');
      fetchCharacters(); // A karakter lista frissítése
    }
  };

  // Paginált karakterlista létrehozása
  const paginatedCharacterList = characterList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Oldalváltó függvények
  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* Fejléc */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold">Új Karakter Készítése</h1>
        {user && (
          <div className="text-sm text-right">
            <p>{user.email}</p>
            <p>Szerepkör: <span className="font-medium">{role}</span></p>
          </div>
        )}
      </header>

      {/* Tartalom */}
      <main className="flex flex-1 flex-col items-center justify-start p-6">
        {/* Akciógombok */}
        <div className="w-full max-w-4xl mb-6 flex justify-between">
          <button
            onClick={() => navigate('/main-menu')}
            className="flex items-center gap-2 text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg shadow transition"
          >
            &larr; Főmenü
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow transition"
          >
            <CirclePlus className="w-5 h-5" />
            Új Karakter
          </button>
        </div>

        {/* Űrlap */}
        {showForm && (
          <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-5xl">
            <div className="mb-6 text-center">
              <input
                type="text"
                placeholder="Karakter neve"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="w-3/4 px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fajok */}
              <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
                <h2 className="text-xl font-semibold mb-4">Fajok</h2>
                <ul className="space-y-4">
                  {speciesList.map((species) => (
                    <li key={species.id}>
                      <button
                        onClick={() => selectSpecies(species.id)}
                        className={`flex items-center gap-4 w-full p-4 rounded-lg shadow-md transition transform hover:scale-105 ${
                          selectedSpecies === species.id
                            ? 'bg-blue-500'
                            : 'bg-gray-600 hover:bg-gray-500'
                        } text-white`}
                      >
                        <img
                          src={species.profile_image_url || 'https://via.placeholder.com/50'}
                          alt={species.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="text-lg">{species.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kasztok */}
              {selectedSpecies && (
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
                  <h2 className="text-xl font-semibold mb-4">Kasztok</h2>
                  <ul className="space-y-4">
                    {classList.map((cls) => (
                      <li key={cls.id}>
                        <button
                          onClick={() => selectClass(cls.id)}
                          className={`flex items-center gap-4 w-full p-4 rounded-lg shadow-md transition transform hover:scale-105 ${
                            selectedClass === cls.id
                              ? 'bg-green-500'
                              : 'bg-gray-600 hover:bg-gray-500'
                          } text-white`}
                        >
                          <img
                            src={cls.profile_image_url || 'https://via.placeholder.com/50'}
                            alt={cls.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <span className="text-lg">{cls.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tulajdonságok */}
              {selectedClass && (
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner col-span-1 md:col-span-2">
                  <h2 className="text-xl font-semibold mb-4">Tulajdonságok</h2>
                  <ul className="space-y-4">
                    {Object.entries(attributes).map(([attribute, value]) => (
                      <li key={attribute} className="flex items-center justify-between">
                        <span className="text-lg">
                          {attribute} ({calculateBonus(value)})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decreaseAttribute(attribute as AttributeKeys)}
                            className="text-gray-300 hover:text-white"
                          >
                            <CircleMinus className="w-6 h-6" />
                          </button>
                          <span className="text-white text-lg">{value}</span>
                          <button
                            onClick={() => increaseAttribute(attribute as AttributeKeys)}
                            className="text-gray-300 hover:text-white"
                          >
                            <CirclePlus className="w-6 h-6" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-center text-lg">
                    Hátralevő pontok: <span className="font-semibold">{remainingPoints}</span>
                  </div>
                </div>
              )}

              {/* Skillek */}
              {selectedClass && (
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner col-span-1 md:col-span-2">
                  <h2 className="text-xl font-semibold mb-4">Képzettségek</h2>
                  <ul className="space-y-2">
                    {skills.map((skill) => (
                      <li key={skill.id} className="text-lg">
                        {skill.name} ({skill.attribute}: {calculateBonus(attributes[skill.attribute as AttributeKeys])})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Mentés és Mégse Gombok */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={saveCharacter}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg transition"
              >
                Mentés
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition"
              >
                Mégse
              </button>
            </div>
          </div>
        )}

        {/* Karakter lista */}
        <div
          className={`bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-5xl ${
            showForm ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <h2 className="text-2xl font-bold mb-4">Karakterek</h2>
          {paginatedCharacterList.length === 0 ? (
            <p className="text-gray-400">Nincsenek megjelenítendő karakterek.</p>
          ) : (
            <ul className="space-y-4">
              {paginatedCharacterList.map((character) => (
                <li
                  key={character.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-700 p-4 rounded-lg shadow hover:bg-gray-600 transition"
                >
                  <div>
                    <h3 className="text-xl font-semibold">{character.name}</h3>
                    <p className="text-gray-300">{character.species} - {character.class}</p>
                    {role === 'admin' && (
                      <p className="text-gray-400">Tulajdonos: {character.ownerEmail}</p>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      onClick={() => viewCharacterDetails(character.id)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
                    >
                      Részletek
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => modifyCharacter(character.id)}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow transition"
                      >
                        Módosítás
                      </button>
                    )}
                    <button
                      onClick={() => deleteCharacter(character.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow transition"
                    >
                      Törlés
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Navigációs elemek */}
          <div className="flex justify-center items-center mt-6 space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } transition`}
            >
              Előző
            </button>

            {/* Oldalszámok megjelenítése */}
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === page
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                } transition`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${
                currentPage === totalPages
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } transition`}
            >
              Következő
            </button>
          </div>
        </div>
      </main>

      {/* Értesítések */}
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <p className="text-white mb-4">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              Tovább
            </button>
          </div>
        </div>
      )}

      {/* Karakter részletei modális */}
      {selectedCharacterDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-11/12 max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">{selectedCharacterDetails.name}</h2>
            <p className="text-gray-300">Faj: {selectedCharacterDetails.species}</p>
            <p className="text-gray-300">Kaszt: {selectedCharacterDetails.class}</p>
            {role === 'admin' && (
              <p className="text-gray-400">Tulajdonos: {selectedCharacterDetails.ownerEmail}</p>
            )}
            <h3 className="text-xl font-semibold text-white mt-6">Tulajdonságok</h3>
            <ul className="text-gray-300 list-disc list-inside">
              {Object.entries(selectedCharacterDetails.attributes).map(([key, value]) => (
                <li key={key}>
                  {key}: {value as number} ({calculateBonus(value)})
                </li>
              ))}
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6">Képzettségek</h3>
            <ul className="text-gray-300 list-disc list-inside">
              {selectedCharacterDetails.skills.map((skill: string) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedCharacterDetails(null)}
              className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCharacter;