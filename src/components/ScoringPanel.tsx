import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface Score {
  subject_id: number;
  score: number;
}

interface Adviser {
  id: number;
  name: string;
  subject_id: number;
  subject_name: string;
  group_id: number;
  level: 'MFA1' | 'MFA2' | 'PFA1' | 'PFA2';
}

interface Candidate {
  id: number;
  name: string;
  group_id: number;
  level: 'MFA1' | 'MFA2' | 'PFA1' | 'PFA2';
  scores: Score[];
}

interface TeamData {
  advisers: Adviser[];
  candidates: Candidate[];
}

interface TeamGroupedData {
  [team: string]: TeamData;
}

interface ScoringPanelProps {
  panelId: string;
  getScore: (adviserId: number, candidateId: number, subjectId: number) => number | undefined;
  onScoreChange: (adviserId: number, candidateId: number, subjectId: number, score: number) => void;
  currentUserId: number;
}

// Add level order mapping for sorting
const levelOrder = {
  'MFA1': 1,
  'MFA2': 2,
  'PFA1': 3,
  'PFA2': 4
};

export function ScoringPanel({ panelId, getScore, onScoreChange, currentUserId }: ScoringPanelProps) {
  // Fetch candidates and advisers grouped by team
  const { data: teamData, isLoading } = useQuery<TeamGroupedData>({
    queryKey: ['candidates-grouped', panelId],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${panelId}/candidates-grouped`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      return data || {}; // Return empty object if no data
    },
  });

  if (isLoading) return <div className="text-gray-500">Loading candidates...</div>;
  if (!teamData || Object.keys(teamData).length === 0) {
    return <div className="text-gray-500">No candidates assigned to teams yet.</div>;
  }

  // Find the current user's group_id and level
  let userGroupId: number | null = null;
  let userLevel: 'MFA1' | 'MFA2' | 'PFA1' | 'PFA2' | null = null;
  for (const { advisers } of Object.values(teamData)) {
    const currentAdviser = advisers.find(a => a.id === currentUserId);
    if (currentAdviser) {
      userGroupId = currentAdviser.group_id;
      userLevel = currentAdviser.level;
      break;
    }
  }

  return (
    <div className="space-y-4">
      {Object.entries(teamData).map(([team, { advisers, candidates }]) => {
        // Filter candidates to only show those in the same group and level as the current user
        const filteredCandidates = userGroupId && userLevel
          ? candidates.filter(c => c.group_id === userGroupId && c.level === userLevel)
          : candidates;

        // Filter advisers to only show those with the same level and sort by level
        const filteredAdvisers = userLevel
          ? advisers
              .filter(a => a.level === userLevel)
              .sort((a, b) => levelOrder[a.level] - levelOrder[b.level])
          : advisers.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

        // If there are no candidates in this group/level, don't show the team section
        if (filteredCandidates.length === 0) return null;

        return (
          <div key={team} className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Team {team} - {userLevel}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    {filteredAdvisers.map((adviser) => (
                      <th key={adviser.id} scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div>{adviser.name} ({adviser.level})</div>
                        <div className="text-xs text-gray-400 normal-case">{adviser.subject_name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {candidate.name}
                      </td>
                      {filteredAdvisers.map((adviser) => (
                        <td key={adviser.id} className="px-3 py-2 whitespace-nowrap">
                          <select
                            value={getScore(adviser.id, candidate.id, adviser.subject_id) ?? ''}
                            onChange={(e) => {
                              const score = parseInt(e.target.value);
                              if (!isNaN(score)) {
                                onScoreChange(adviser.id, candidate.id, adviser.subject_id, score);
                              }
                            }}
                            className="block w-16 rounded border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                              <option key={score} value={score}>
                                {score}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
