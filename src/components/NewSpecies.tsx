// NewSpecies.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Species, User, Profile } from './types/interface';

const NewSpecies: React.FC = () => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [paginatedSpecies, setPaginatedSpecies] = useState<Species[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [ability1, setAbility1] = useState<string>('');
  const [ability2, setAbility2] = useState<string>('');
  const [ability3, setAbility3] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false); // Az űrlap alapértelmezetten rejtett
  const [notification, setNotification] = useState<string | null>(null); // Értesítések kezelése
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 5;

  // Felhasználói információk betöltése
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Nem sikerült betölteni a felhasználói adatokat:', error);
        return;
      }

      const fetchedUser: User | null = data.user
        ? { id: data.user.id, email: data.user.email || '' }
        : null;
      setUser(fetchedUser);

      if (fetchedUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, id') // Biztosítsd, hogy az 'id' is ki legyen választva
          .eq('id', fetchedUser.id)
          .single();

        if (profileError) {
          console.error('Nem sikerült betölteni a szerepkört:', profileError);
        } else {
          // Type assertion használata a típusok helyes kezelésére
          const typedProfileData = profileData as Profile | null;
          setRole(typedProfileData?.role || 'user');
        }
      }
    };

    fetchUser();
  }, []);

  // Fajok betöltése
  const fetchSpecies = async () => {
    const { data, error } = await supabase
      .from('species')
      .select('*');

    if (error) {
      console.error('Hiba a fajok betöltésekor:', error);
    } else {
      // Type assertion használata a típusok helyes kezelésére
      const typedData = data as Species[] | null;
      setSpeciesList(typedData || []);
    }
  };

  useEffect(() => {
    fetchSpecies();
  }, []);

  // Lapozás beállítása
  useEffect(() => {
    const total = Math.ceil(speciesList.length / ITEMS_PER_PAGE);
    setTotalPages(total);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedSpecies(speciesList.slice(startIndex, endIndex));
  }, [speciesList, currentPage]);

  // Lapozás kezelése
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Új faj mentése
  const saveSpecies = async () => {
    const speciesData = { name, description, profile_image_url: profileImageUrl, ability1, ability2, ability3 };

    if (editingId) {
      // Frissítés
      const { error } = await supabase
        .from('species')
        .update(speciesData)
        .eq('id', editingId);
      if (error) {
        console.error('Hiba a faj frissítésekor:', error);
      } else {
        setNotification('Faj sikeresen frissítve!');
        resetForm();
        fetchSpecies();
      }
    } else {
      // Létrehozás
      const { error } = await supabase
        .from('species')
        .insert([speciesData]);
      if (error) {
        console.error('Hiba a faj létrehozásakor:', error);
      } else {
        setNotification('Új faj sikeresen létrehozva!');
        resetForm();
        fetchSpecies();
      }
    }
  };

  // Faj törlése
  const deleteSpecies = async (id: string) => {
    const { error } = await supabase
      .from('species')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Hiba a faj törlésekor:', error);
    } else {
      setNotification('Faj sikeresen törölve!');
      fetchSpecies();
    }
  };

  // Űrlap visszaállítása
  const resetForm = () => {
    setName('');
    setDescription('');
    setProfileImageUrl('');
    setAbility1('');
    setAbility2('');
    setAbility3('');
    setEditingId(null);
    setShowForm(false); // Űrlap bezárása mentés vagy megszakítás után
  };

  // Faj szerkesztése
  const editSpecies = (species: Species) => {
    setName(species.name);
    setDescription(species.description);
    setProfileImageUrl(species.profile_image_url);
    setAbility1(species.ability1);
    setAbility2(species.ability2);
    setAbility3(species.ability3);
    setEditingId(species.id);
    setShowForm(true); // Űrlap megnyitása szerkesztéshez
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Új faj készítése</h1>
        {user && (
          <div className="text-white text-sm text-right">
            <p>{user.email}</p>
            <p>
              Szerepkör: <span className="font-medium">{role}</span>
            </p>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <button
            onClick={() => navigate('/main-menu')}
            className="flex items-center gap-2 text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg mb-6"
          >
            &larr; Főmenü
          </button>
          <button
            onClick={() => setShowForm(true)} // Űrlap megjelenítése
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition mb-6"
          >
            Faj létrehozása
          </button>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Faj szerkesztése' : 'Új faj létrehozása'}</h2>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Név"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Leírás"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Profilkép URL"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={ability1}
                  onChange={(e) => setAbility1(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Képesség 1</option>
                  <option value="special1">Special 1</option>
                  <option value="special2">Special 2</option>
                </select>
                <select
                  value={ability2}
                  onChange={(e) => setAbility2(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Képesség 2</option>
                  <option value="special1">Special 1</option>
                  <option value="special2">Special 2</option>
                </select>
                <select
                  value={ability3}
                  onChange={(e) => setAbility3(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Képesség 3</option>
                  <option value="special1">Special 1</option>
                  <option value="special2">Special 2</option>
                </select>
                <button
                  onClick={saveSpecies}
                  className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Mentés
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Szerkesztés Mégse
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Meglévő fajok</h2>
            <ul className="flex flex-col gap-4">
              {paginatedSpecies.map((species) => (
                <li key={species.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg text-white">
                  <img
                    src={species.profile_image_url || 'https://via.placeholder.com/50'}
                    alt={species.name}
                    className="w-12 h-12 rounded-lg object-cover mr-4"
                  />
                  <span className="flex-1">{species.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editSpecies(species)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    >
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => deleteSpecies(species.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Törlés
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Lapozás */}
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                disabled={currentPage === 1}
              >
                &larr;
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index + 1)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === index + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                disabled={currentPage === totalPages}
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>

      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <p className="text-white mb-4">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Tovább
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSpecies;
