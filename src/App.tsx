import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { PanelList } from './components/PanelList';
import { PanelDetail } from './components/PanelDetail';
import { TaskTemplates } from './components/TaskTemplates';
import { TaskTemplateManager } from './components/TaskTemplateManager';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { StatsDashboard } from './components/reports/StatsDashboard';
import { ImportPage } from './components/import/ImportPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<PanelList />} />
              <Route path="/panels/:id" element={<PanelDetail />} />
              <Route path="/task-templates" element={<TaskTemplateManager />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reports" element={<StatsDashboard />} />
              <Route path="/import" element={<ImportPage />} />
            </Routes>
          </div>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;