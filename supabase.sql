-- Módosítjuk a class_abilities táblát

-- Először létrehozzuk az enum típust a képesség típusokhoz
CREATE TYPE ability_type AS ENUM ('Támadás', 'Védekezés', 'Gyógyítás', 'Használati');

-- Módosítjuk a class_abilities táblát
CREATE TABLE class_abilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type ability_type NOT NULL,
    main_attribute TEXT NOT NULL, -- Módosítva: mainAttribute helyett main_attribute
    energy_cost INTEGER NOT NULL DEFAULT 0, -- Módosítva: energyCost helyett energy_cost
    cooldown INTEGER NOT NULL DEFAULT 0,
    profile_image_url TEXT,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb -- Tárolja a képesség specifikus tulajdonságokat
);

-- Megjegyzés: A properties JSONB mező a következő struktúrát követheti:
/*
{
    "damage": {
        "count": number,
        "type": string,
        "modifier": number
    },
    "damageType": string,
    "range": string,
    "protectionType": string,
    "restoreType": string,
    "restoreAmount": number
}
*/

-- Indexek létrehozása a gyakran használt mezőkre
CREATE INDEX idx_class_abilities_type ON class_abilities(type);
CREATE INDEX idx_class_abilities_main_attribute ON class_abilities(main_attribute);