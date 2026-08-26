import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RootLayout } from './components/layout/RootLayout';

import Home from './pages/Home';
import Football from './pages/Football';
import FootballRecruiting from './pages/FootballRecruiting';
import Basketball from './pages/Basketball';
import Baseball from './pages/Baseball';
import LvBasketball from './pages/LvBasketball';
import LvSoftball from './pages/LvSoftball';
import Recruiting from './pages/Recruiting';
import Forums from './pages/Forums';
import ThreadPage from './pages/ThreadPage';
import About from './pages/About';
import CodeOfConduct from './pages/CodeOfConduct';
import UserProfile from './pages/UserProfile';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="football" element={<Football />} />
            <Route path="football-recruiting" element={<FootballRecruiting />} />
            <Route path="basketball" element={<Basketball />} />
            <Route path="baseball" element={<Baseball />} />
            <Route path="lv-basketball" element={<LvBasketball />} />
            <Route path="lv-softball" element={<LvSoftball />} />
            <Route path="recruiting" element={<Recruiting />} />
            <Route path="forums" element={<Forums />} />
            <Route path="forums/:threadId" element={<ThreadPage />} />
            <Route path="about" element={<About />} />
            <Route path="code-of-conduct" element={<CodeOfConduct />} />
            <Route path="profile/:username" element={<UserProfile />} />
            <Route path="admin" element={<Admin />} />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
