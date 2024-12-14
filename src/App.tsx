import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { StatsDashboard } from './components/reports/StatsDashboard';
import { ImportPage } from './components/import/ImportPage';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import SettingsPage from './components/settings/SettingsPage';
import { PanelList } from './components/PanelList';
import { PanelDetail } from './components/PanelDetail';
import { TaskTemplateManager } from './components/TaskTemplateManager';

const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/panels" element={<PanelList />} />
                      <Route path="/panels/:id" element={<PanelDetail />} />
                      <Route path="/task-templates" element={<TaskTemplateManager />} />
                      <Route path="/reports" element={<StatsDashboard />} />
                      <Route 
                        path="/import" 
                        element={
                          <ProtectedRoute requiredRole={['admin']}>
                            <ImportPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;