// src/components/Shop.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingCart, DollarSign } from 'lucide-react';
import { StoreData, ItemData, CharacterState as CharacterStateType, Cash, StorageContent } from './types/interface';
import Pagination from './utils/Pagination'; // Importáljuk az új Pagination komponenst

interface StoreProps {
  initialCharacterState: CharacterStateType; // Nevezd át, hogy egyértelmű legyen
  onClose: () => void;
  storeId: string; // A bolt azonosítója
}

const ITEMS_PER_PAGE = 5; // Átállítjuk 5-re

const Store: React.FC<StoreProps> = ({ initialCharacterState, onClose, storeId }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [storeItems, setStoreItems] = useState<ItemData[]>([]);
  const [playerItems, setPlayerItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Állapot a karakter állapotának tárolásához
  const [characterState, setCharacterState] = useState<CharacterStateType>(initialCharacterState);

  const [storeCash, setStoreCash] = useState<Cash>({
    gold: 0,
    silver: 0,
    copper: 0,
  });

  // Paginálási állapotok
  const [storeCurrentPage, setStoreCurrentPage] = useState(1);
  const [playerCurrentPage, setPlayerCurrentPage] = useState(1);

  // Adatok betöltése
  const fetchData = async () => {
    try {
      setLoading(true);

      // Bolt adatok lekérése a storeId alapján
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStoreData(store);

      // Konvertáljuk a cash mezőt, hogy a null értékek 0-ra legyenek
      setStoreCash({
        gold: store.cash.gold,
        silver: store.cash.silver,
        copper: store.cash.copper,
      });

      // Bolt árukészletének lekérése az initial_inventory-ből
      const storeItemIds = store.initial_inventory.map((item: any) => item.itemId);
      const { data: storeItemsData, error: storeItemsError } = await supabase
        .from('items')
        .select('*') // Győződj meg arról, hogy az image_url is benne van
        .in('id', storeItemIds);

      if (storeItemsError) throw storeItemsError;

      // Tárgyakhoz mennyiség és ár hozzárendelése
      const storeItemsWithDetails = storeItemsData.map((item: any) => {
        const inventoryItem = store.initial_inventory.find((sItem: any) => sItem.itemId === item.id);
        const quantity = inventoryItem ? inventoryItem.quantity : 0;
        const price = calculatePrice(item.price, 'sell'); // +20% profit, returns Cash object
        return { ...item, quantity, price };
      });

      // Szűrjük ki azokat a tárgyakat, amelyeknek a mennyisége nagyobb, mint 0
      const availableStoreItems = storeItemsWithDetails.filter((item: any) => item.quantity > 0);
      setStoreItems(availableStoreItems);

      // Karakter adatok lekérése a characterState.id alapján
      const { data: character, error: characterError } = await supabase
        .from('character_states')
        .select('*')
        .eq('id', characterState.id)
        .single();

      if (characterError) throw characterError;

      // Konvertáljuk a karakter cash mezőjét, hogy a null értékek 0-ra legyenek
      setCharacterState({
        ...character,
        cash: {
          gold: character.cash.gold,
          silver: character.cash.silver,
          copper: character.cash.copper,
        },
      });

      // Felszerelt tárgyak ID-jeinek gyűjtése
      const equippedItemIds = Object.values(character.equipped_items).filter(id => id !== null) as string[];

      // Játékos inventory lekérése
      const playerItemIds = character.inventory;
      const { data: playerItemsData, error: playerItemsError } = await supabase
        .from('items')
        .select('*') // Győződj meg arról, hogy az image_url is benne van
        .in('id', playerItemIds);

      if (playerItemsError) throw playerItemsError;

      // Játékos tárgyainak mennyisége
      const itemCounts = playerItemIds.reduce((acc: { [key: string]: number }, itemId: string) => {
        acc[itemId] = (acc[itemId] || 0) + 1;
        return acc;
      }, {});

      const playerItemsWithDetails = playerItemsData
        .map((item: any) => {
          const quantity = itemCounts[item.id] || 0;
          const price = calculatePrice(item.price, 'buy'); // Fele ár, returns Cash object
          return { ...item, quantity, price };
        })
        .filter((item: any) => item.quantity > 0 && !equippedItemIds.includes(item.id)); // Csak a darabszáma nagyobb, mint 0 és nincs felszerelve

      setPlayerItems(playerItemsWithDetails);
    } catch (err: any) {
      setError('Hiba történt az adatok betöltésekor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, characterState.id]); // Frissítsük, ha a storeId vagy characterState.id változik

  // Ár kiszámítása és Cash objektum létrehozása
  const calculatePrice = (priceJson: any, type: 'buy' | 'sell'): Cash => {
    const basePriceCopper = priceJsonToCopper(priceJson);
    let adjustedPriceCopper: number;

    if (type === 'sell') {
      adjustedPriceCopper = Math.ceil(basePriceCopper * 1.2); // +20% profit
    } else {
      adjustedPriceCopper = Math.floor(basePriceCopper * 0.5); // Fele ár
    }

    return cashFromCopperStatic(adjustedPriceCopper);
  };

  // Pénz konverzió réz egységre
  const priceJsonToCopper = (priceJson: any) => {
    return (
      (priceJson.gold || 0) * 100 +
      (priceJson.silver || 0) * 10 +
      (priceJson.copper || 0)
    );
  };

  // Réz egységből pénz struktúra
  const cashFromCopper = (copper: number): Cash => {
    const gold = Math.floor(copper / 100);
    copper -= gold * 100;
    const silver = Math.floor(copper / 10);
    copper -= silver * 10;
    return { gold, silver, copper };
  };

  // Pénz konverzió réz egységre statikus kontextusban
  const cashFromCopperStatic = (copper: number): Cash => {
    const gold = Math.floor(copper / 100);
    copper -= gold * 100;
    const silver = Math.floor(copper / 10);
    copper -= silver * 10;
    return { gold, silver, copper };
  };

  // Pénz összegzése rézben
  const totalCopper = (cash: Cash) => {
    return cash.gold * 100 + cash.silver * 10 + cash.copper;
  };

  // Vásárlás kezelése
  const handleBuy = async (item: ItemData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Ellenőrizzük, hogy van-e elég készlet a boltban
      const storeItem = storeData?.initial_inventory.find((sItem: any) => sItem.itemId === item.id);
      if (!storeItem || storeItem.quantity <= 0) {
        setError('A boltban nincs több ebből a termékből.');
        return;
      }

      // Ellenőrizzük az inventory méretét
      const currentInventoryCount = characterState.inventory.length;
      if (currentInventoryCount >= characterState.maxInventorySize) {
        setError('Nincs elég helyed az inventory-ban.');
        return;
      }

      const priceInCopper = totalCopper(item.price); // Correctly computes from Cash object
      const playerTotalCopper = totalCopper(characterState.cash);
      if (playerTotalCopper < priceInCopper) {
        setError('Nincs elég pénzed a vásárláshoz.');
        return;
      }

      // Készletek frissítése az initial_inventory alapján
      const updatedInitialInventory = storeData.initial_inventory.map((sItem: any) =>
        sItem.itemId === item.id ? { ...sItem, quantity: sItem.quantity - 1 } : sItem
      );

      const updatedStoreItem = updatedInitialInventory.find((sItem: any) => sItem.itemId === item.id);
      if (updatedStoreItem && updatedStoreItem.quantity < 0) {
        setError('A boltban nincs több ebből a termékből.');
        return;
      }

      // Pénz frissítése
      const newPlayerCashCopper = playerTotalCopper - priceInCopper;
      const newStoreCashCopper = totalCopper(storeCash) + priceInCopper;

      // Adatbázis frissítése
      const { error: playerUpdateError } = await supabase
        .from('character_states')
        .update({
          inventory: [...characterState.inventory, item.id],
          cash: cashFromCopper(newPlayerCashCopper),
        })
        .eq('id', characterState.id);

      if (playerUpdateError) throw playerUpdateError;

      const { error: storeUpdateError } = await supabase
        .from('stores')
        .update({
          initial_inventory: updatedInitialInventory,
          cash: cashFromCopper(newStoreCashCopper),
        })
        .eq('id', storeData?.id);

      if (storeUpdateError) throw storeUpdateError;

      // Re-fetch the store and character data to ensure synchronization
      await fetchData();

      // Sikeres vásárlás üzenet
      setSuccessMessage(`Sikeresen vásároltál: ${item.name}`);
    } catch (err: any) {
      setError('Hiba történt a vásárlás során.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Eladás kezelése
  const handleSell = async (item: ItemData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const priceInCopper = totalCopper(item.price);
      const storeTotalCopper = totalCopper(storeCash);
      if (storeTotalCopper < priceInCopper) {
        setError('A boltosnak nincs elég pénze a vásárláshoz.');
        return;
      }

      // Ellenőrizzük, hogy a játékos rendelkezik-e a tárggyal
      const itemIndex = characterState.inventory.indexOf(item.id);
      if (itemIndex === -1) {
        setError('Nincs ilyen tárgyad.');
        return;
      }

      // Remove only one instance from player's inventory
      const newPlayerInventory = [...characterState.inventory];
      newPlayerInventory.splice(itemIndex, 1); // Csak az első előfordulást távolítja el

      // Ha a tárgy 'storage' típusú, töröljük a storage_contents bejegyzéseket
      if (item.type.toLowerCase() === 'storage') {
        const { error: storageDeleteError } = await supabase
          .from('storage_contents')
          .delete()
          .eq('storage_item_id', item.id)
          .eq('character_id', characterState.id);

        if (storageDeleteError) {
          console.error('Hiba a storage_contents törlésekor:', storageDeleteError);
          setError('Hiba a storage tartalmának törlésekor.');
          return;
        }
      }

      // Készlet frissítése az initial_inventory alapján
      let updatedInitialInventory: StoreData['initial_inventory'] = [];
      if (storeData?.initial_inventory) {
        const existingStockItem = storeData.initial_inventory.find((sItem: any) => sItem.itemId === item.id);
        if (existingStockItem) {
          updatedInitialInventory = storeData.initial_inventory.map((sItem: any) =>
            sItem.itemId === item.id ? { ...sItem, quantity: sItem.quantity + 1 } : sItem
          );
        } else {
          // Ha a bolt nem rendelkezik a tárggyal, hozzáadjuk az initial_inventory-hoz
          updatedInitialInventory = [...storeData.initial_inventory, { itemId: item.id, quantity: 1 }];
        }
      } else {
        // Ha nincs initial_inventory, létrehozzuk
        updatedInitialInventory = [{ itemId: item.id, quantity: 1 }];
      }

      // Pénz frissítése
      const newPlayerCashCopper = totalCopper(characterState.cash) + priceInCopper;
      const newStoreCashCopper = storeTotalCopper - priceInCopper;

      // Adatbázis frissítése
      const { error: playerUpdateError } = await supabase
        .from('character_states')
        .update({
          inventory: newPlayerInventory,
          cash: cashFromCopper(newPlayerCashCopper),
        })
        .eq('id', characterState.id);

      if (playerUpdateError) throw playerUpdateError;

      const { error: storeUpdateError } = await supabase
        .from('stores')
        .update({
          initial_inventory: updatedInitialInventory,
          cash: cashFromCopper(newStoreCashCopper),
        })
        .eq('id', storeData?.id);

      if (storeUpdateError) throw storeUpdateError;

      // Re-fetch the store and character data to ensure synchronization
      await fetchData();

      // Sikeres eladás üzenet
      setSuccessMessage(`Sikeresen eladtál: ${item.name}`);
    } catch (err: any) {
      setError('Hiba történt az eladás során.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Paginált elemek kiszámítása és üres helyek hozzáadása
  const getPaginatedItems = (items: ItemData[], currentPage: number): (ItemData | null)[] => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Ha a tárgyak száma kevesebb, mint ITEMS_PER_PAGE, adjunk hozzá üres helyeket
    while (paginatedItems.length < ITEMS_PER_PAGE) {
      paginatedItems.push(null);
    }

    return paginatedItems;
  };

  // Total pages kiszámítása
  const getTotalPages = (items: ItemData[]) => {
    return Math.ceil(items.length / ITEMS_PER_PAGE) || 1; // Legalább 1 oldal
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="text-white text-lg animate-pulse">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-5xl mx-4 relative overflow-y-auto max-h-screen">
        <h2 className="text-3xl font-bold mb-6 text-center">{storeData?.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Játékos inventory */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-4">Saját Tárgyak</h3>
            <div className="space-y-4">
              {getPaginatedItems(playerItems, playerCurrentPage).map((item, index) =>
                item ? (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg shadow-md transition transform hover:scale-105">
                    <div className="flex items-center">
                      {/* Kép megjelenítése */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={`${item.name} kép`}
                          className="w-12 h-12 mr-4 object-contain rounded"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 mr-4 flex items-center justify-center bg-gray-600 rounded">
                          <span className="text-white text-sm">N/A</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xl text-white">{item.name}</h4>
                        <p className="text-gray-300">Mennyiség: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-yellow-300 font-semibold">{formatCash(totalCopper(item.price))} </span>
                      <button
                        onClick={() => handleSell(item)}
                        className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        disabled={loading}
                        title="Eladás"
                      >
                        <DollarSign size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={`empty-player-${index}`} className="flex items-center justify-center bg-gray-700 p-4 rounded-lg shadow-md">
                    <span className="text-gray-500">Üres hely</span>
                  </div>
                )
              )}
              {playerItems.length === 0 && (
                <div className="text-gray-400 text-center col-span-2">Nincsenek tárgyaid.</div>
              )}
            </div>
            {/* Paginálás */}
            <Pagination
              currentPage={playerCurrentPage}
              totalPages={getTotalPages(playerItems)}
              onPageChange={(page) => setPlayerCurrentPage(page)}
            />
          </div>

          {/* Bolt árukészlet */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-4">Bolt Áruk</h3>
            <div className="space-y-4">
              {getPaginatedItems(storeItems, storeCurrentPage).map((item, index) =>
                item ? (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg shadow-md transition transform hover:scale-105">
                    <div className="flex items-center">
                      {/* Kép megjelenítése */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={`${item.name} kép`}
                          className="w-12 h-12 mr-4 object-contain rounded"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 mr-4 flex items-center justify-center bg-gray-600 rounded">
                          <span className="text-white text-sm">N/A</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xl text-white">{item.name}</h4>
                        <p className="text-gray-300">Készlet: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-yellow-300 font-semibold">{formatCash(totalCopper(item.price))} </span>
                      <button
                        onClick={() => handleBuy(item)}
                        className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                        disabled={loading}
                        title="Vásárlás"
                      >
                        <ShoppingCart size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={`empty-store-${index}`} className="flex items-center justify-center bg-gray-700 p-4 rounded-lg shadow-md">
                    <span className="text-gray-500">Üres hely</span>
                  </div>
                )
              )}
              {storeItems.length === 0 && (
                <div className="text-gray-400 text-center col-span-2">Nincs elérhető tárgy a boltban.</div>
              )}
            </div>
            {/* Paginálás */}
            <Pagination
              currentPage={storeCurrentPage}
              totalPages={getTotalPages(storeItems)}
              onPageChange={(page) => setStoreCurrentPage(page)}
            />
          </div>
        </div>

        {/* Pénz megjelenítése */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-4 md:mb-0">
            <h4 className="font-bold text-xl">Játékos Pénze</h4>
            <p className="text-gray-300">
              {formatCash(totalCopper(characterState.cash))} 
            </p>
          </div>
          <div className="text-white">
            <h4 className="font-bold text-xl">Boltos Pénze</h4>
            <p className="text-gray-300">
              {formatCash(totalCopper(storeCash))} 
            </p>
          </div>
        </div>

        {/* Üzenetek */}
        {successMessage && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="underline text-sm">
              Bezárás
            </button>
          </div>
        )}
        {error && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="underline text-sm">
              Bezárás
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
};

// Segédfüggvény a pénz formázásához
const formatCash = (copper: number) => {
  const { gold, silver, copper: remainingCopper } = cashFromCopperStatic(copper);
  let result = '';
  if (gold > 0) result += `${gold} arany `;
  if (silver > 0) result += `${silver} ezüst `;
  if (remainingCopper > 0 || result === '') result += `${remainingCopper} réz`;
  return result.trim();
};

// Pénz konverzió réz egységre statikus kontextusban
const cashFromCopperStatic = (copper: number): Cash => {
  const gold = Math.floor(copper / 100);
  copper -= gold * 100;
  const silver = Math.floor(copper / 10);
  copper -= silver * 10;
  return { gold, silver, copper };
};

export default Store;
