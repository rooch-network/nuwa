import { Outlet } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CreateAgent } from './pages/CreateAgent';
import { CharacterList } from './pages/AgentList';
import { AgentDetail } from './pages/AgentDetail';
// Import Chat component when it's available
// import { Chat } from './pages/Chat';

import "@roochnetwork/rooch-sdk-kit/dist/index.css"; 
import '@radix-ui/themes/styles.css'                 
import './App.css'                                    

function App() {
  return (
    <div className="app-container">
      {/* App-level UI elements can go here */}
      <Outlet />
    </div>
  );
}

export default App;
