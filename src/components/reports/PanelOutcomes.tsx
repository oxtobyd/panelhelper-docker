import React, { useEffect, useState } from 'react';
import { PieChart, BarChart } from 'lucide-react';

interface Outcome {
  outcome: string;
  count: number;
}

interface PanelOutcomesProps {
  season: string;
}

const outcomeColors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  'Recommended': { 
    bg: 'bg-green-100', 
    text: 'text-green-700',
    border: 'border-green-200',
    fill: '#dcfce7' // green-100
  },
  'Recommended with Preparation': { 
    bg: 'bg-green-50', 
    text: 'text-green-600',
    border: 'border-green-100',
    fill: '#f0fdf4' // green-50
  },
  'Not Yet Ready to Proceed': { 
    bg: 'bg-blue-100', 
    text: 'text-blue-700',
    border: 'border-blue-200',
    fill: '#dbeafe' // blue-100
  },
  'Advice Not to Proceed': { 
    bg: 'bg-red-100', 
    text: 'text-red-700',
    border: 'border-red-200',
    fill: '#fee2e2' // red-100
  },
  'Conditionally Recommended': { 
    bg: 'bg-red-50', 
    text: 'text-red-600',
    border: 'border-red-100',
    fill: '#fef2f2' // red-50
  }
};

export const PanelOutcomes: React.FC<PanelOutcomesProps> = ({ season }) => {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'bar' | 'donut'>('bar');

  useEffect(() => {
    const fetchOutcomes = async () => {
      setLoading(true);
      try {
        const url = season
          ? `/api/reports/panel-outcomes?season=${season}`
          : '/api/reports/panel-outcomes';
        const response = await fetch(url);
        const data = await response.json();
        setOutcomes(data);
      } catch (error) {
        console.error('Error fetching outcomes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOutcomes();
  }, [season]);

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-64"></div>;
  }

  const total = outcomes.reduce((sum, o) => sum + o.count, 0);

  const renderBarView = () => (
    <div className="space-y-4">
      {outcomes.map((outcome, index) => {
        const percentage = ((outcome.count / total) * 100).toFixed(1);
        const colors = outcomeColors[outcome.outcome] || { 
          bg: 'bg-blue-100', 
          text: 'text-blue-700',
          border: 'border-blue-200',
          fill: '#dbeafe' // blue-100
        };
        
        return (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                {outcome.outcome}
              </span>
              <span className={`text-sm font-bold ${colors.text}`}>
                {outcome.count} ({percentage}%)
              </span>
            </div>
            <div className="relative">
              <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-100">
                <div
                  style={{ width: `${percentage}%` }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colors.bg} transition-all duration-500`}
                >
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDonutView = () => {
    const radius = 30;
    const centerX = 50;
    const centerY = 50;
    
    return (
    <div className="relative h-[500px]">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {outcomes.map((outcome, index) => {
          const percentage = (outcome.count / total) * 100;
          const colors = outcomeColors[outcome.outcome] || { 
            bg: 'bg-gray-100', 
            text: 'text-gray-700',
            border: 'border-gray-200',
            fill: '#f3f4f6' // gray-100
          };
          
          // Calculate the segment of the donut
          let startAngle = outcomes
            .slice(0, index)
            .reduce((sum, o) => sum + (o.count / total) * 360, 0);
          let endAngle = startAngle + (outcome.count / total) * 360;
          
          // Convert to radians
          const startRad = (startAngle - 90) * Math.PI / 180;
          const endRad = (endAngle - 90) * Math.PI / 180;
          
          // Calculate the path
          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);
          
          const largeArcFlag = percentage > 50 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${centerX} ${centerY}`
          ].join(' ');

          // Calculate label position
          const midAngle = (startRad + endRad) / 2;
          const labelRadius = radius + 20; // Slightly closer
          const labelX = centerX + labelRadius * Math.cos(midAngle);
          const labelY = centerY + labelRadius * Math.sin(midAngle);
          
          // Calculate connector line points
          const connectorStartRadius = radius + 2;
          const connectorEndRadius = radius + 18;
          const connectorStartX = centerX + connectorStartRadius * Math.cos(midAngle);
          const connectorStartY = centerY + connectorStartRadius * Math.sin(midAngle);
          const connectorEndX = centerX + connectorEndRadius * Math.cos(midAngle);
          const connectorEndY = centerY + connectorEndRadius * Math.sin(midAngle);
          
          return (
            <g key={index}>
              <path
                d={pathData}
                fill={colors.fill}
                stroke="white"
                strokeWidth="1"
              />
              {percentage >= 3 && (
                <>
                  <line
                    x1={connectorStartX}
                    y1={connectorStartY}
                    x2={connectorEndX}
                    y2={connectorEndY}
                    stroke="#9CA3AF"
                    strokeWidth="0.5"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={midAngle > Math.PI ? "end" : "start"}
                    dominantBaseline="middle"
                    className="text-[3.5px] fill-gray-700 font-medium"
                  >
                    {outcome.outcome}
                    <tspan 
                      x={labelX} 
                      dy="3.5"
                      textAnchor={midAngle > Math.PI ? "end" : "start"}
                      className="font-bold"
                    >
                      {outcome.count} ({percentage.toFixed(1)}%)
                    </tspan>
                  </text>
                </>
              )}
            </g>
          );
        })}
        {/* Add filter for text outline */}
        <defs>
          <filter x="-0.1" y="-0.1" width="1.2" height="1.2" id="solid">
            <feFlood floodColor="white"/>
            <feComposite in="SourceGraphic" operator="xor"/>
          </filter>
        </defs>
        <circle cx={centerX} cy={centerY} r="15" className="fill-white"/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500">Total Outcomes</div>
        </div>
      </div>
    </div>
  )};

  return (
    <div className="space-y-6">
      {/* Main Panel Outcomes Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Panel Outcomes</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('bar')}
              className={`p-2 rounded-lg ${
                view === 'bar' 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('donut')}
              className={`p-2 rounded-lg ${
                view === 'donut' 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PieChart className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="mt-4">
          {view === 'bar' ? renderBarView() : renderDonutView()}
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* Total Outcomes Card */}
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="text-sm font-medium text-gray-600">Total Outcomes</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{total}</div>
          </div>
          
          {outcomes.map((outcome, index) => {
            const colors = outcomeColors[outcome.outcome] || { 
              bg: 'bg-gray-100', 
              text: 'text-gray-700',
              border: 'border-gray-200',
              fill: '#f3f4f6' // gray-100
            };
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
              >
                <div className={`text-sm font-medium ${colors.text}`}>
                  {outcome.outcome}
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {outcome.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
