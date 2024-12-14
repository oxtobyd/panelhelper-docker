import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutGrid, Calendar, Settings, BarChart, Upload, BarChart2, Home, FileSpreadsheet, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      icon: <LayoutGrid className="w-6 h-6" />,
      label: 'Dashboard',
      href: '/dashboard',
      description: 'Overview and statistics'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      label: 'Panels',
      href: '/panels',
      description: 'Manage panel and carousel sessions'
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      label: 'Tasks',
      href: '/task-templates',
      description: 'Manage task templates and assignments'
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      label: 'Reports',
      href: '/reports',
      description: 'Panel reporting and analytics'
    },
    {
      icon: <Upload className="w-6 h-6" />,
      label: 'Import',
      href: '/import',
      description: 'Import Excel data'
    },
    {
      icon: <Settings className="w-6 h-6" />,
      label: 'Settings',
      href: '/settings',
      description: 'Manage venue locations'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Panel Helper Logo" 
                className="h-8 w-auto mr-3"
              />
              <span className="ml-2 text-xl font-semibold text-gray-900">Panel Helper</span>
            </div>
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600"
                >
                  <div className="flex flex-col items-center">
                    {item.icon}
                    <span className="mt-1 text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-blue-600"
              >
                <div className="flex flex-col items-center">
                  <LogOut className="w-6 h-6" />
                  <span className="mt-1 text-sm">Logout</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}