import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './components/Login';
import MainMenu from './components/MainMenu';
import NewCharacter from './components/NewCharacter';
import NewSpecies from './components/NewSpecies';
import NewClasses from './components/NewClasses';
import NewSkills from './components/NewSkills';
import NewItems from './components/NewItems';
import NewMonsters from './components/NewMonsters';
import NewTerrain from './components/NewTerrain';
import MapEditor from './components/MapEditor';
import NewEvent from './components/NewEvent';
import PlayGame from './components/PlayGame';
import Combat from './components/Combat';
import Abilities from './components/Abilities';
import NewStores from './components/NewStores';
import NewEncounter from './components/NewEncounter';
import GatheringLists from './components/GatheringLists';
import NewSpells from './components/NewSpells';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/main-menu" element={<MainMenu />} />
        <Route path="/new-character" element={<NewCharacter />} />
        <Route path="/new-species" element={<NewSpecies />} />
        <Route path="/new-classes" element={<NewClasses />} />
        <Route path="/new-skills" element={<NewSkills />} />
        <Route path="/new-items" element={<NewItems />} />
        <Route path="/new-terrain" element={<NewTerrain />} />
        <Route path="/new-monsters" element={<NewMonsters />} />
        <Route path="/map-editor" element={<MapEditor />} />
        <Route path="/new-event" element={<NewEvent />} />
        <Route path="/play-game" element={<PlayGame />} />
        <Route path="/new-combat" element={<Combat />} />
        <Route path="/new-abilities" element={<Abilities />} />
        <Route path="/new-stores" element={<NewStores />} />
        <Route path="/new-encounter" element={<NewEncounter />} />
        <Route path="/gathering-lists" element={<GatheringLists />} />
        <Route path="/new-spells" element={<NewSpells />} />
      </Routes>
    </Router>
  );
}

export default App;
