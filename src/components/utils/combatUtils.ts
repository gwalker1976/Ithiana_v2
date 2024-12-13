// combatUtils.ts

/**
 * Simulates rolling a specified number of dice of a given type.
 * @param count - The number of dice to roll.
 * @param type - The type of dice to roll (e.g., 'd6', 'd20').
 * @returns The total result of the dice rolls.
 */
 export const rollDice = (count: number, type: string): number => {
  let total = 0;
  const diceMax = parseInt(type.slice(1), 10);
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * diceMax) + 1;
    total += roll;
  }
  return total;
};

/**
 * Calculates the monster's attack bonus based on the difficulty level.
 * @param baseAttack - The base attack value of the monster.
 * @param difficulty - The difficulty level ('Könnyű', 'Közepes', 'Nehéz', 'Halálos', 'Legendás').
 * @returns The adjusted attack bonus.
 */
export const calculateMonsterAttack = (baseAttack: number, difficulty: string): number => {
  switch (difficulty) {
    case 'Könnyű':
      return baseAttack + 1;
    case 'Közepes':
      return baseAttack + 3;
    case 'Nehéz':
      return baseAttack + 7;
    case 'Halálos':
      return baseAttack + 17;
    case 'Legendás':
      return baseAttack + 35;
    default:
      return baseAttack;
  }
};

/**
 * Calculates the bonus based on an attribute value.
 * @param value - The attribute value.
 * @returns The calculated bonus.
 */
export const calculateBonus = (value: number): number => {
  if (value <= 9) return -1;
  if (value <= 11) return 0;
  if (value <= 13) return 1;
  return 2;
};

/**
 * Calculates the attack bonus based on strength, level, and optional weapon attack bonus.
 * @param strength - The character's strength attribute value.
 * @param level - The character's level.
 * @param weaponAttack - (Optional) The weapon's attack bonus.
 * @returns The total attack bonus.
 */
export const calculateAttackBonus = (strength: number, level: number, weaponAttack: number = 0): number => {
  return calculateBonus(strength) + level + weaponAttack;
};

/**
 * Calculates the defense based on dexterity.
 * @param dexterity - The character's dexterity attribute value.
 * @returns The defense value.
 */
export const calculateDefense = (dexterity: number): number => {
  return calculateBonus(dexterity);
};

/**
 * Calculates the total damage string, including base damage, modifiers, and strength bonuses.
 * @param baseDamageCount - The number of damage dice (e.g., 1 for 1d6).
 * @param baseDamageType - The type of damage dice (e.g., 'd6', 'd8').
 * @param baseDamageModifier - The base damage modifier from the weapon.
 * @param strength - The character's strength attribute value.
 * @param weaponDamageModifier - (Optional) Additional damage modifier from the weapon.
 * @returns A formatted string representing the total damage (e.g., '1d6+3').
 */
export const calculateTotalDamage = (
  baseDamageCount: number,
  baseDamageType: string,
  baseDamageModifier: number,
  strength: number,
  weaponDamageModifier: number = 0
): string => {
  const strengthBonus = calculateBonus(strength);
  const totalModifier = baseDamageModifier + strengthBonus + weaponDamageModifier;
  return `${baseDamageCount}${baseDamageType}${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
};

/**
 * Calculates the actual total damage value based on weapon and strength modifiers.
 * @param baseDamageCount - The number of damage dice.
 * @param baseDamageType - The type of damage dice.
 * @param baseDamageModifier - The base damage modifier from the weapon.
 * @param strength - The character's strength attribute value.
 * @param weaponDamageModifier - (Optional) Additional damage modifier from the weapon.
 * @returns The total damage as a number.
 */
export const getTotalDamageValue = (
  baseDamageCount: number,
  baseDamageType: string,
  baseDamageModifier: number,
  strength: number,
  weaponDamageModifier: number = 0
): number => {
  const diceTotal = rollDice(baseDamageCount, baseDamageType);
  const strengthBonus = calculateBonus(strength);
  const totalModifier = baseDamageModifier + strengthBonus + weaponDamageModifier;
  return diceTotal + totalModifier;
};
