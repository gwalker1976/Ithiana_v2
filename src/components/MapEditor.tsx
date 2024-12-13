import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { TerrainType, MapTile } from './types/interface'

interface Event {
  id: string;
  name: string;
  type: string;
  monster?: {
    name: string;
    type: string;
    difficulty: string;
  };
}

interface MapEvent {
  event_id: string;
  chance: number;
}

const MapEditor: React.FC = () => {
  const navigate = useNavigate();
  const [terrainTypes, setTerrainTypes] = useState<TerrainType[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType | null>(null);
  const [mapTiles, setMapTiles] = useState<Map<string, MapTile>>(new Map());
  const [currentX, setCurrentX] = useState(500);
  const [currentY, setCurrentY] = useState(500);
  const [notification, setNotification] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [eventChance, setEventChance] = useState<number>(100);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const VIEWPORT_SIZE = 4;

  // Fetch user data and role
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

  // Fetch terrain types and events
  useEffect(() => {
    const fetchTerrainTypes = async () => {
      const { data, error } = await supabase
        .from('terrains')
        .select('*')
        .order('name');

      if (error) {
        setNotification('Hiba a tereptípusok betöltésekor');
      } else {
        setTerrainTypes(data || []);
      }
    };

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
        .order('name');

      if (error) {
        setNotification('Hiba az események betöltésekor');
      } else {
        setEvents(data || []);
      }
    };

    fetchTerrainTypes();
    fetchEvents();
  }, []);

  // Load visible map tiles
  const loadVisibleTiles = useCallback(async () => {
    const minX = currentX - VIEWPORT_SIZE;
    const maxX = currentX + VIEWPORT_SIZE;
    const minY = currentY - VIEWPORT_SIZE;
    const maxY = currentY + VIEWPORT_SIZE;

    const { data, error } = await supabase
      .from('map_tiles')
      .select('*')
      .gte('x', minX)
      .lte('x', maxX)
      .gte('y', minY)
      .lte('y', maxY);

    if (error) {
      setNotification('Hiba a térkép betöltésekor');
      return;
    }

    const newTiles = new Map<string, MapTile>();
    data?.forEach(tile => {
      newTiles.set(`${tile.x},${tile.y}`, tile);
    });
    setMapTiles(newTiles);
  }, [currentX, currentY]);

  useEffect(() => {
    loadVisibleTiles();
  }, [loadVisibleTiles]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (showEventModal) return; // Disable keyboard controls when modal is open

      let newX = currentX;
      let newY = currentY;

      switch (e.key) {
        case 'ArrowUp':
          newY = Math.max(0, currentY - 1);
          break;
        case 'ArrowDown':
          newY = Math.min(999, currentY + 1);
          break;
        case 'ArrowLeft':
          newX = Math.max(0, currentX - 1);
          break;
        case 'ArrowRight':
          newX = Math.min(999, currentX + 1);
          break;
        case ' ':
          if (selectedTerrain) {
            e.preventDefault();
            const { error } = await supabase
              .from('map_tiles')
              .upsert({
                x: currentX,
                y: currentY,
                terrain_id: selectedTerrain.id
              });

            if (error) {
              setNotification('Hiba a terep elhelyezésekor');
            } else {
              loadVisibleTiles();
            }
          }
          break;
        default:
          return;
      }

      if (newX !== currentX || newY !== currentY) {
        setCurrentX(newX);
        setCurrentY(newY);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentX, currentY, selectedTerrain, loadVisibleTiles, showEventModal]);

  // Handle event editing
  const openEventModal = (x: number, y: number) => {
    setSelectedTile({ x, y });
    const tile = mapTiles.get(`${x},${y}`);
    if (tile) {
      setSelectedEvent(tile.event_id || '');
      setEventChance(tile.event_chance || 100);
    } else {
      setSelectedEvent('');
      setEventChance(100);
    }
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!selectedTile) return;

    try {
      const { error } = await supabase
        .from('map_tiles')
        .upsert({
          x: selectedTile.x,
          y: selectedTile.y,
          terrain_id: mapTiles.get(`${selectedTile.x},${selectedTile.y}`)?.terrain_id || null,
          event_id: selectedEvent || null,
          event_chance: selectedEvent ? eventChance : null
        });

      if (error) throw error;

      setNotification('Esemény sikeresen mentve!');
      loadVisibleTiles();
      setShowEventModal(false);
    } catch (error: any) {
      setNotification(`Hiba: ${error.message}`);
    }
  };

  // Get background color for terrain
  const getTerrainColor = (terrain: TerrainType | null) => {
    if (!terrain) return 'rgb(31, 41, 55)'; // bg-gray-800
    switch (terrain.color) {
      case 'red': return 'rgb(239, 68, 68)';
      case 'green': return 'rgb(34, 197, 94)';
      case 'blue': return 'rgb(59, 130, 246)';
      case 'yellow': return 'rgb(234, 179, 8)';
      case 'purple': return 'rgb(168, 85, 247)';
      case 'pink': return 'rgb(236, 72, 153)';
      case 'orange': return 'rgb(249, 115, 22)';
      case 'brown': return 'rgb(120, 53, 15)';
      case 'teal': return 'rgb(20, 184, 166)';
      case 'gray': return 'rgb(107, 114, 128)';
      default: return 'rgb(31, 41, 55)'; // bg-gray-800
    }
  };

  // Render map grid
  const renderGrid = () => {
    const grid = [];
    const size = VIEWPORT_SIZE * 2 + 1;

    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        const mapX = currentX - VIEWPORT_SIZE + x;
        const mapY = currentY - VIEWPORT_SIZE + y;
        const tile = mapTiles.get(`${mapX},${mapY}`);
        const terrain = tile ? terrainTypes.find(t => t.id === tile.terrain_id) : null;
        const isCurrent = mapX === currentX && mapY === currentY;
        const isHovered = hoveredTile?.x === mapX && hoveredTile?.y === mapY;

        row.push(
          <div
            key={`${mapX},${mapY}`}
            className={`w-12 h-12 border border-gray-700 flex items-center justify-center relative ${
              isCurrent ? 'border-2 border-white' : ''
            }`}
            style={{
              backgroundColor: getTerrainColor(terrain)
            }}
            onMouseEnter={() => setHoveredTile({ x: mapX, y: mapY })}
            onMouseLeave={() => setHoveredTile(null)}
          >
            {terrain && terrain.icon && (
              React.createElement(
                (Icons as any)[terrain.icon],
                { className: "w-6 h-6 text-white" }
              )
            )}
            {tile?.event_id && (
              <div className="absolute top-0 right-0">
                <Icons.Star className="w-4 h-4 text-yellow-500" />
              </div>
            )}
            {isHovered && (
              <button
                onClick={() => openEventModal(mapX, mapY)}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
              >
                <Icons.Edit className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        );
      }
      grid.push(
        <div key={y} className="flex">
          {row}
        </div>
      );
    }

    return grid;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="flex justify-between items-center px-6 py-4 bg-gray-700 shadow-md">
        <h1 className="text-2xl font-bold text-white">Térképszerkesztő</h1>
        <div className="text-white text-sm">
          Pozíció: ({currentX}, {currentY})
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="flex gap-6">
          {/* Terrain selection */}
          <div className="w-64 bg-gray-800 p-4 rounded-lg">
            <h2 className="text-white font-bold mb-4">Tereptípusok</h2>
            <div className="space-y-2">
              {terrainTypes.map(terrain => (
                <button
                  key={terrain.id}
                  onClick={() => setSelectedTerrain(terrain)}
                  className={`w-full p-2 rounded-lg flex items-center justify-between`}
                  style={{
                    backgroundColor: selectedTerrain?.id === terrain.id 
                      ? 'rgb(59, 130, 246)' 
                      : getTerrainColor(terrain)
                  }}
                >
                  <div className="flex items-center gap-2">
                    {terrain.icon && React.createElement(
                      (Icons as any)[terrain.icon],
                      { className: "w-5 h-5 text-white" }
                    )}
                    <span className="text-white">{terrain.name}</span>
                  </div>
                  {React.createElement(
                    (Icons as any)[terrain.traversable ? 'Footprints' : 'OctagonMinus'],
                    { className: "w-5 h-5 text-white" }
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Map grid */}
          <div className="flex-1 bg-gray-800 p-4 rounded-lg">
            <div className="flex flex-col items-center">
              {renderGrid()}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/main-menu')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            ← Vissza a főmenübe
          </button>
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-white font-bold text-xl mb-4">Esemény szerkesztése</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-bold mb-2">
                  Esemény
                </label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nincs esemény</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} {event.monster && `(${event.monster.name})`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent && (
                <div>
                  <label className="block text-white text-sm font-bold mb-2">
                    Esemény esélye (%)
                  </label>
                  <input
                    type="number"
                    value={eventChance}
                    onChange={(e) => setEventChance(Math.min(100, Math.max(1, Number(e.target.value))))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Mégse
              </button>
              <button
                onClick={saveEvent}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <p className="text-white mb-4">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEditor;