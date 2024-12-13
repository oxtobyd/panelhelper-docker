import React from 'react';

interface SeasonSelectorProps {
  seasons: string[];
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
}

export const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  seasons,
  selectedSeason,
  onSeasonChange,
}) => {
  return (
    <div className="flex items-center space-x-4">
      <label htmlFor="season" className="text-sm font-medium text-gray-700">
        Season
      </label>
      <select
        id="season"
        value={selectedSeason}
        onChange={(e) => onSeasonChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-gray-900 border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        <option value="">All Seasons</option>
        {seasons.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>
  );
};
