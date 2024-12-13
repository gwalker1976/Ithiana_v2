// src/util/useTime.ts
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export interface TimeState {
  year: number;
  season: string;
  day: number;
  hour: number;
}

const SEASONS = ['Ébredés', 'Áradás', 'Aranyszél', 'Perzselő', 'Ködpalást', 'Dermedő'];
const DAYS_IN_SEASON = 17;
const HOURS_IN_DAY = 24;
const STARTING_YEAR = 1300;
const STARTING_SEASON = 'Ébredés';
const STARTING_DAY = 1;
const STARTING_HOUR = 0;

const useTime = (characterId: number | null) => {
  const [time, setTime] = useState<TimeState | null>(null);

  const fetchTime = async () => {
    if (characterId === null) {
      console.warn('useTime hook hívása karakter ID nélkül.');
      return;
    }

    console.log(`Fetching time for character ID: ${characterId}`);

    const { data, error } = await supabase
      .from('character_time')
      .select('*')
      .eq('character_id', characterId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Ha a rekord nem létezik, létrehozza az alapértelmezett értékekkel
        console.log('Character time record not found. Creating a new one.');

        const { error: insertError } = await supabase
          .from('character_time')
          .insert([{
            character_id: characterId,
            year: STARTING_YEAR,
            season: STARTING_SEASON,
            day: STARTING_DAY,
            hour: STARTING_HOUR
          }]);

        if (insertError) {
          console.error('Hiba az idő inicializálásakor:', insertError);
        } else {
          setTime({
            year: STARTING_YEAR,
            season: STARTING_SEASON,
            day: STARTING_DAY,
            hour: STARTING_HOUR,
          });
          console.log('Character time initialized with default values.');
        }
      } else {
        console.error('Hiba az idő lekérdezésekor:', error);
      }
    } else if (data) {
      setTime({
        year: data.year,
        season: data.season,
        day: data.day,
        hour: data.hour,
      });
      console.log('Character time fetched:', data);
    }
  };

  useEffect(() => {
    fetchTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const incrementTime = async () => {
    if (!time || characterId === null) {
      console.warn('incrementTime hívása idő vagy karakter ID nélkül.');
      return;
    }

    let { year, season, day, hour } = time;
    hour += 1;

    if (hour >= HOURS_IN_DAY) {
      hour = 0;
      day += 1;

      if (day > DAYS_IN_SEASON) {
        day = 1;
        const currentSeasonIndex = SEASONS.indexOf(season);
        let nextSeasonIndex = currentSeasonIndex + 1;

        if (nextSeasonIndex >= SEASONS.length) {
          nextSeasonIndex = 0;
          year += 1;
        }

        season = SEASONS[nextSeasonIndex];
      }
    }

    console.log(`Incrementing time for character ID: ${characterId} to Year: ${year}, Season: ${season}, Day: ${day}, Hour: ${hour}`);

    const { data, error } = await supabase
      .from('character_time')
      .upsert({
        character_id: characterId,
        year,
        season,
        day,
        hour,
      }, { onConflict: 'character_id' });

    if (error) {
      console.error('Hiba az idő frissítésekor:', error);
    } else {
      setTime({ year, season, day, hour });
      console.log('Time incremented successfully:', { year, season, day, hour });
    }
  };

  // Új addTime függvény
  const addTime = async (hoursToAdd: number) => {
    if (!time || characterId === null) {
      console.warn('addTime hívása idő vagy karakter ID nélkül.');
      return;
    }

    let { year, season, day, hour } = time;

    const totalHours = hour + hoursToAdd;
    const additionalDays = Math.floor(totalHours / HOURS_IN_DAY);
    const newHour = totalHours % HOURS_IN_DAY;

    const totalDays = day + additionalDays;
    const additionalSeasons = Math.floor((totalDays - 1) / DAYS_IN_SEASON);
    const newDay = ((totalDays - 1) % DAYS_IN_SEASON) + 1;

    const currentSeasonIndex = SEASONS.indexOf(season);
    const totalSeasons = currentSeasonIndex + additionalSeasons;
    const newSeasonIndex = totalSeasons % SEASONS.length;
    const newYear = year + Math.floor(totalSeasons / SEASONS.length);

    const newSeason = SEASONS[newSeasonIndex];

    console.log(`Adding ${hoursToAdd} hours for character ID: ${characterId} to Year: ${newYear}, Season: ${newSeason}, Day: ${newDay}, Hour: ${newHour}`);

    const { data, error } = await supabase
      .from('character_time')
      .upsert({
        character_id: characterId,
        year: newYear,
        season: newSeason,
        day: newDay,
        hour: newHour,
      }, { onConflict: 'character_id' });

    if (error) {
      console.error('Hiba az idő frissítésekor:', error);
    } else {
      setTime({ year: newYear, season: newSeason, day: newDay, hour: newHour });
      console.log('Time incremented successfully:', { year: newYear, season: newSeason, day: newDay, hour: newHour });
    }
  };

  return { time, incrementTime, addTime };
};

export default useTime;
