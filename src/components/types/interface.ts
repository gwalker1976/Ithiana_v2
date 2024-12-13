// src/types/interface.ts

type AttributeKeys = 'Erő' | 'Ügyesség' | 'Egészség' | 'Elme' | 'Bölcsesség' | 'Karizma';

export type ItemType = 
  | 'Weapon' 
  | 'Armor' 
  | 'Shield'
  | 'RangedWeapon'
  | 'Amulet'
  | 'Ring'
  | 'Gloves'
  | 'Boots'
  | 'Cloak'
  | 'Belt'
  | 'Material'
  | 'Ammunition'
  | 'Élelem'
  | 'Storage'; // Új típus hozzáadása

export type RarityType = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Unique' | 'Epic' | 'Legendary';

export type EventType = 'Harc' | 'Teleport' | 'Kincs' | 'Bolt';

export type MonsterType = 'Zöldbőrű' | 'Élőholt' | 'Humanoid' | 'Óriás' | 'Borzalom' | 'Aberráció';
export type DifficultyLevel = 'Könnyű' | 'Közepes' | 'Nehéz' | 'Halálos' | 'Legendás';
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface Spell {
  id: string;
  name: string;
  description: string; // Új mező a leíráshoz
  range: number; // Hatótáv méterben
  duration: 'azonnali' | 'perc';
  duration_minutes?: number; // Csak 'perc' típusnál
  type: 'Általános' | 'Idézés' | 'Okozás' | 'Jóslás' | 'Gyógyítás' | 'Védelem';
  summoned_item_id?: string; // Csak 'Idézés' típusnál, idegen kulcs az 'items' táblára
  energy_cost: number; // Energia költség
  image_url?: string; // Opcióális kép URL-je
}

export interface StorageContent {
  id: string;
  storage_item_id: string;
  contained_item_id: string;
  quantity: number;
  character_id: string; // Új mező hozzáadása
}

export interface EncounterList {
  id: string;
  name: string;
}

export interface Encounter {
  id: string;
  event_Id: string;
  intervalStart: number;
  intervalEnd: number;
}

export interface CharacterTime {
  character_id: number;
  year: number;
  season: string;
  day: number;
  hour: number;
  last_updated: string; // ISO string formátumban
}

export interface MapTile {
  x: number;
  y: number;
  terrain_id: string | null;
  event_id?: string;
  event_chance?: number;
  event: Event;
}

export interface DefenseBuff {
  abilityId: string;
  defenseAmount: number;
  remainingDuration: number;
  abilityImageUrl?: string;
}

export interface AttackBuff {
  abilityId: string;
  attackAmount: number;
  remainingDuration: number;
  abilityImageUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
}

export interface ItemData extends InventoryItem {
  price: { gold: number; silver: number; copper: number };
  quantity?: number;
}

export interface StoreData {
  id: string;
  name: string;
  initial_inventory: { itemId: string; quantity: number }[];
  cash: { gold: number; silver: number; copper: number };
  stock: { itemId: string; quantity: number }[];
}

export interface Class {
  id: string;
  name: string;
  profile_image_url?: string;
  species: string[];
  abilities: Ability[];
  base_hp: number;
  hp_per_level: number;
  energy_attribute: AttributeKeys;
  base_energy: number;
  energy_per_level: number;
}

export interface DiceRoll {
  count: number;
  type: DiceType;
  modifier: number;
}

export interface Monster {
  id: string;
  name: string;
  type: MonsterType;
  difficulty: DifficultyLevel;
  description: string;
  gold_min?: number;
  gold_max?: number;
  silver_min?: number;
  silver_max?: number;
  copper_min?: number;
  copper_max?: number;
  health: {
    count: number;
    type: DiceType;
    modifier: number;
  };
  attack: number;
  defense: number;
  damage: {
    type: DiceType;
    count: number;
    modifier: number;
  };
  profile_image_url?: string;
  loot?: Array<{
    itemId: string;
    dropChance: number;
  }>;
}

export interface Component {
  itemId: string;
  quantity: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  weight: number;
  price: {
    gold: number;
    silver: number;
    copper: number;
  };
  type: ItemType;
  damage?: {
    count: number;
    type: DiceType;
    modifier: number;
  };
  attack?: number;
  defense?: number;
  components: Component[];
  crafting_time: number;
  image_url?: string;
  stackable: boolean;
  crafting_terrain?: string;
  special_abilities: string[];
  rarity: RarityType;
  wearable: boolean;
  capacity?: number;
  allowed_items?: string[];
  special_effects?: string[];
  required_item_id?: string;
  isUsable?: boolean;
  usableInCombat?: boolean;
  serving_value?: number; // Új mező az adag értékhez
  collection_terrain?: string; // Új mező a gyűjtési tereptípushoz
}

export interface InventoryDisplayItem extends Item {
  count: number;
  equipped: boolean;
  unique_key?: string; // Egyedi azonosító a React kulcsokhoz
  contents_count?: number;
}

export interface CharacterData {
  id: string;
  profile_id: string;
  name: string;
  species: string;
  class: string;
  attributes: Record<AttributeKeys, number>;
  skills: string[];
  ownerEmail?: string;
  profile_image_url: string;
}

export interface Skill {
  id: number; // Serial, number típusú
  name: string;
  description: string;
  classes: string[];
  attribute: AttributeKeys;
  // level: number; // Eltávolítva, mivel nincs a skills táblában
}

export interface Species {
  id: string;
  name: string;
  description: string;
  profile_image_url: string;
  ability1: string;
  ability2: string;
  ability3: string;
}

export interface TerrainType {
  id: string;
  name: string;
  traversable: boolean;
  custom_image_url: string;
  use_custom_image: boolean;
  icon: string;
  encounter_list_id: string;
  encounter_percentage: number;
  descriptions: string[];
  color: string;
}

export interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  role: string;
}

export interface Ability {
  id: string;
  name: string;
  level: number;
  description: string;
  type: string;
  mainAttribute: string;
  energyCost: number;
  cooldown: number;
  profile_image_url?: string;
  properties: {
    damage?: DiceRoll;
    damageType?: string;
    range?: string;
    protectionType?: string;
    defenseAmount?: number;
    duration?: number;
    restoreType?: string;
    restoreAmount?: number;
    attackAmount?: number;
  };
}

export interface Cash {
  gold: number;
  silver: number;
  copper: number;
}

export interface CharacterSkillEntry {
  skill_id: number;
  skill_level: number;
}

export interface CharacterState {
  id: string;
  x: number;
  y: number;
  current_health: number;
  max_health: number;
  inventory: string[];
  maxInventorySize: number;
  equipped_items?: {
    weapon?: string;
    armor?: string;
    shield?: string;
    ranged_weapon?: string;
    amulet?: string;
    ring?: string;
    gloves?: string;
    boots?: string;
    cloak?: string;
    belt?: string;
    ammunition?: string;
  };
  skills: CharacterSkillEntry[];
  level: number;
  total_attack: number;
  total_defense: number;
  base_attack: number;
  base_defense: number;
  fatigue: number;        // Új mező
  hunger: number;        // Új mező
  thirst: number;        // Új mező
  temperature: number;   // Új mező
  cash: Cash;

  last_fatigue_decrement_hour: number;
  last_hunger_decrement_hour: number;
  last_thirst_decrement_hour: number;
}

export interface LootItem {
  item: Item;
  quantity: number;
}

export interface TreasureItem {
  itemId: string;
  dropChance: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  type: EventType;
  monster_id?: string;
  teleport_x?: number;
  teleport_y?: number;
  treasure_items?: TreasureItem[];
  shop_name?: string;
  is_permanent: boolean;
  is_once: boolean; // Új mező hozzáadva
  profile_image_url?: string;
}

export interface GatheringList {
  id: string;
  name: string;
  terrain_id: string;
  created_at: string; // vagy Date, ha konvertálod
}

export interface GatheringData {
  id: string;
  gathering_list_id: string;
  item_id: string;
  interval_start: number;
  interval_end: number;
}

export interface CharacterEvent {
  character_id: number;
  event_id: string;
  completed_at: string; // ISO string formátumban
}
