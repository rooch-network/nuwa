import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Chat from './pages/Chat';
import Explore from './pages/Explore';
import Profile from './pages/Profile';

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="chat" element={<Chat />} />
                <Route path="explore" element={<Explore />} />
                <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
    );
}

export default App;
