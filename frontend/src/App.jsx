
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';

import Dashboard from './pages/dashboard';
import AIModels from './pages/ai-models';
import Projects from './pages/projects';
import Analytics from './pages/analytics';
import Settings from './pages/settings';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ai-models" element={<AIModels />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
