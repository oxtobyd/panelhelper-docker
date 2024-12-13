import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 rounded-md shadow p-2.5 transition-all duration-300 hover:shadow-md hover:scale-[1.01] border border-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">{title}</h3>
        {icon && (
          <div className="text-lg text-indigo-500 bg-indigo-50 p-1 rounded-md">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline">
        <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
          {value}
        </p>
        {subtitle && (
          <p className="ml-1.5 text-[10px] font-medium text-gray-500">{subtitle}</p>
        )}
      </div>
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-gradient-to-br from-indigo-100 to-transparent rounded-full opacity-20 transform rotate-12"></div>
    </div>
  );
};
