// combat/types.ts v1.1

export interface DiceRoll {
  count: number;
  type: string; // Például: 'd6', 'd8'
  modifier: number;
}

export type Damage = DiceRoll; // Alias létrehozása a redundancia elkerülésére

export interface Monster {
  id: string;
  name: string;
  type: string;
  difficulty: 'Könnyű' | 'Közepes' | 'Nehéz' | 'Halálos' | 'Legendás';
  health: DiceRoll;
  attack: number;
  defense: number;
  damage: DiceRoll; // vagy Damage, mivel Damage = DiceRoll
  profile_image_url?: string;
  loot?: Array<{
    itemId: string;
    dropChance: number;
  }>;
}

export interface ClassAbility {
  id: string;
  name: string;
  type: string;
  energy_cost: number;
  cooldown: number;
  properties: {
    damage?: Damage; // Használhatod a Damage típust
    damageType?: string;
    range?: string;
    healing?: number;
    // További tulajdonságok szükség szerint
    mainAttribute?: string;
  };
}

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  attributes: {
    Erő: number;
    Ügyesség: number;
    Egészség: number;
    Elme: number;
    Bölcsesség: number;
    Karizma: number;
  };
}

export interface CharacterState {
  id: string;
  character_id: string;
  current_health: number;
  max_health: number;
  level: number;
  equipped_items?: Record<string, string>;
  inventory?: string[]; // Hozzáadva, ha még nincs
  total_attack: number; // Új mező
  total_defense: number; // Új mező
}
