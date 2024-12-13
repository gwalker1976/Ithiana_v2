// MainMenu.tsx
import React from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  DoorOpen,
  FlaskRound,
  Sword,
  Hammer,
  Box,
  Bug,
  TreeDeciduous,
  Map,
  Calendar,
  Play,
  Sparkles,
  Store,
  BookOpen,
  List,
} from 'lucide-react';

const MainMenu: React.FC = () => {
  const [user, setUser] = React.useState<any>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<boolean>(true);

  // Click sound for buttons
  const playClickSound = () => {
    const audio = new Audio('/click.mp3');
    audio.play();
  };

  // Felhasználói információk és szerepkör betöltése
  React.useEffect(() => {
    const getUserData = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Nem sikerült betölteni a felhasználói adatokat:', error);
          setLoading(false);
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
          .from('profiles')
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

  // Kilépés funkció
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Kilépés sikertelen:', error);
    } else {
      console.log('Felhasználó kilépett.');
      navigate('/');
    }
  };

  const handleButtonClick = (path: string) => {
    playClickSound();
    navigate(path);
  };

  const buttonStyle =
    'w-64 py-2 px-4 bg-slate-700 text-white font-semibold rounded-lg shadow hover:bg-slate-600 transition relative flex items-center justify-center';

  // Definiáljuk a shared és admin menüket
  const sharedMenus = [
    { icon: <Users className="w-5 h-5 mr-2" />, label: 'Karakterek kezelése', path: '/new-character' },
    { icon: <Play className="w-5 h-5 mr-2" />, label: 'Új játék indítása', path: '/play-game' },
    // Új menüpont hozzáadása itt, ha mindkét szerepkör számára elérhető
  ];

  const adminMenusColumn1 = [
    { icon: <User className="w-5 h-5 mr-2" />, label: 'Felhasználók kezelése', path: '/manage-users' },
  ];

  const adminMenusColumn2 = [
    { icon: <Sword className="w-5 h-5 mr-2" />, label: 'Kasztok kezelése', path: '/new-classes' },
    { icon: <FlaskRound className="w-5 h-5 mr-2" />, label: 'Fajok kezelése', path: '/new-species' },
    { icon: <Hammer className="w-5 h-5 mr-2" />, label: 'Képzettségek kezelése', path: '/new-skills' },
    { icon: <Sparkles className="w-5 h-5 mr-2" />, label: 'Speciális képességek', path: '/new-abilities' },
    { icon: <Box className="w-5 h-5 mr-2" />, label: 'Tárgyak kezelése', path: '/new-items' },
    { icon: <Bug className="w-5 h-5 mr-2" />, label: 'Szörnyek kezelése', path: '/new-monsters' },
    { icon: <Bug className="w-5 h-5 mr-2" />, label: 'Varázslatok kezelése', path: '/new-spells' },
  ];

  const adminMenusColumn3 = [
    { icon: <TreeDeciduous className="w-5 h-5 mr-2" />, label: 'Tereptípusok kezelése', path: '/new-terrain' },
    { icon: <Map className="w-5 h-5 mr-2" />, label: 'Térképszerkesztő', path: '/map-editor' },
    { icon: <Calendar className="w-5 h-5 mr-2" />, label: 'Eseményszerkesztő', path: '/new-event' },
    { icon: <Store className="w-5 h-5 mr-2" />, label: 'Boltlétrehozás', path: '/new-stores' },
    { icon: <BookOpen className="w-5 h-5 mr-2" />, label: 'Küldetések kezelése', path: '/new-quests' },
    { icon: <List className="w-5 h-5 mr-2" />, label: 'Véletlen találkozások', path: '/new-encounter' },
    { icon: <List className="w-5 h-5 mr-2" />, label: 'Gyűjtögetés listák', path: '/gathering-lists' }, // Új gomb hozzáadva
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Főmenü</h1>
        {user && (
          <div className="text-white text-sm text-right">
            <p>{user.email}</p>
            <p>
              Szerepkör: <span className="font-medium">{role}</span>
            </p>
          </div>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        {loading ? (
          <div className="text-white">Betöltés...</div>
        ) : role === 'admin' ? (
          <div className="grid grid-cols-3 gap-12">
            {/* Első oszlop */}
            <div className="flex flex-col gap-4 items-center">
              {sharedMenus.map((menu, index) => (
                <button
                  key={`shared-menu-${index}`}
                  onClick={() => handleButtonClick(menu.path)}
                  className={buttonStyle}
                >
                  {menu.icon}
                  <span>{menu.label}</span>
                </button>
              ))}
              {adminMenusColumn1.map((menu, index) => (
                <button
                  key={`admin-menu1-${index}`}
                  onClick={() => handleButtonClick(menu.path)}
                  className={buttonStyle}
                >
                  {menu.icon}
                  <span>{menu.label}</span>
                </button>
              ))}
            </div>

            {/* Második oszlop */}
            <div className="flex flex-col gap-4 items-center">
              {adminMenusColumn2.map((menu, index) => (
                <button
                  key={`admin-menu2-${index}`}
                  onClick={() => handleButtonClick(menu.path)}
                  className={buttonStyle}
                >
                  {menu.icon}
                  <span>{menu.label}</span>
                </button>
              ))}
            </div>

            {/* Harmadik oszlop */}
            <div className="flex flex-col gap-4 items-center">
              {adminMenusColumn3.map((menu, index) => (
                <button
                  key={`admin-menu3-${index}`}
                  onClick={() => handleButtonClick(menu.path)}
                  className={buttonStyle}
                >
                  {menu.icon}
                  <span>{menu.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : role === 'user' ? (
          <div className="flex flex-col gap-4 items-center">
            {sharedMenus.map((menu, index) => (
              <button
                key={`user-menu-${index}`}
                onClick={() => handleButtonClick(menu.path)}
                className={buttonStyle}
              >
                {menu.icon}
                <span>{menu.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-white">Nem ismeretes a szerepkör.</div>
        )}
      </main>

      <div className="flex justify-center pb-8">
        <button
          onClick={handleLogout}
          className="w-64 py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700 transition relative flex items-center justify-center mt-8"
        >
          <DoorOpen className="w-5 h-5 mr-2" />
          <span>Kilépés</span>
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
