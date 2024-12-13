// Skills.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Skill, Class } from './types/interface';

const Skills: React.FC = () => {
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [classList, setClassList] = useState<Class[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedAttribute, setSelectedAttribute] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;
  const navigate = useNavigate();

  // Elérhető tulajdonságok
  const attributes: string[] = ['Erő', 'Ügyesség', 'Elme', 'Bölcsesség', 'Karizma', 'Egészség'];

  // Képzettségek betöltése
  const fetchSkills = async () => {
    const { data, error } = await supabase.from('skills').select('*');

    if (error) {
      console.error('Hiba a képzettségek betöltésekor:', error);
    } else {
      const typedData = data as Skill[] | null;
      setSkillsList(typedData || []);
    }
  };

  // Kasztok betöltése
  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*');

    if (error) {
      console.error('Hiba a kasztok betöltésekor:', error);
    } else {
      const typedData = data as Class[] | null;
      setClassList(typedData || []);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchClasses();
  }, []);

  useEffect(() => {
    const total = Math.ceil(skillsList.length / ITEMS_PER_PAGE);
    setTotalPages(total);
  }, [skillsList]);

  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const saveSkill = async () => {
    const skillData = {
      name,
      description,
      classes: selectedClasses,
      attribute: selectedAttribute,
    };

    if (editingId) {
      // Frissítés
      const { error } = await supabase
        .from('skills')
        .update(skillData)
        .eq('id', editingId);

      if (error) {
        console.error('Hiba a képzettség frissítésekor:', error);
        setNotification('Hiba történt a képzettség frissítésekor.');
      } else {
        setNotification('Képzettség sikeresen frissítve!');
        resetForm();
        fetchSkills();
      }
    } else {
      // Létrehozás
      const { error } = await supabase.from('skills').insert([skillData]);

      if (error) {
        console.error('Hiba a képzettség létrehozásakor:', error);
        setNotification('Hiba történt az új képzettség létrehozásakor.');
      } else {
        setNotification('Új képzettség sikeresen létrehozva!');
        resetForm();
        fetchSkills();
      }
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedClasses([]);
    setSelectedAttribute('');
    setEditingId(null);
    setShowForm(false);
  };

  const editSkill = (skill: Skill) => {
    setName(skill.name);
    setDescription(skill.description);
    setSelectedClasses(skill.classes || []);
    setSelectedAttribute(skill.attribute || '');
    setEditingId(skill.id);
    setShowForm(true);
  };

  const deleteSkill = async (id: string) => {
    const { error } = await supabase.from('skills').delete().eq('id', id);

    if (error) {
      console.error('Hiba a képzettség törlésekor:', error);
      setNotification('Hiba történt a képzettség törlésekor.');
    } else {
      setNotification('Képzettség sikeresen törölve!');
      fetchSkills();
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Képzettségek kezelése</h1>
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
            onClick={() => setShowForm(true)}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition mb-6"
          >
            Új képzettség létrehozása
          </button>

          {showForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Képzettség szerkesztése' : 'Új képzettség létrehozása'}
              </h2>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Képzettség neve"
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
                <div>
                  <h3 className="text-white mb-2">Kapcsolódó kasztok</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {classList.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 text-white">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.id)}
                          onChange={() => toggleClassSelection(cls.id)}
                        />
                        {cls.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-white mb-2">Hozzárendelt tulajdonság</h3>
                  <select
                    value={selectedAttribute}
                    onChange={(e) => setSelectedAttribute(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Válassz egy tulajdonságot</option>
                    {attributes.map((attribute) => (
                      <option key={attribute} value={attribute}>
                        {attribute}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveSkill}
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
            <h2 className="text-xl font-bold text-white mb-4">Meglévő képzettségek</h2>
            <ul className="flex flex-col gap-4">
              {skillsList
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((skill) => (
                  <li key={skill.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg text-white">
                    <span className="flex-1">
                      {skill.name} ({skill.attribute})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editSkill(skill)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                      >
                        Szerkesztés
                      </button>
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        Törlés
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
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

export default Skills;

