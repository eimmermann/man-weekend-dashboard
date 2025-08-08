"use client";

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import type { PickleballGame, Attendee } from '@/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type PlayerStats = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  bestTeammate: {
    id: string;
    name: string;
    wins: number;
    totalGames: number;
  } | null;
  totalGames: number;
};

type SortField = 'name' | 'wins' | 'losses' | 'winRate' | 'totalGames' | 'bestTeammate';
type SortDirection = 'asc' | 'desc';

export default function PickleballTracker() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<PickleballGame | null>(null);
  const [view, setView] = useState<'games' | 'summary'>('games');
  const [sortField, setSortField] = useState<SortField>('winRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { data: games = [], mutate, error } = useSWR<PickleballGame[]>('/api/pickleball', fetcher);
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);

  // Debug logging
  console.log('PickleballTracker - games:', games);
  console.log('PickleballTracker - error:', error);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [team1Player1Id, setTeam1Player1Id] = useState('');
  const [team1Player2Id, setTeam1Player2Id] = useState('');
  const [team2Player1Id, setTeam2Player1Id] = useState('');
  const [team2Player2Id, setTeam2Player2Id] = useState('');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Calculate player statistics
  const playerStats = useMemo((): PlayerStats[] => {
    const stats = new Map<string, PlayerStats>();
    
    // Initialize stats for all attendees
    attendees.forEach(attendee => {
      stats.set(attendee.id, {
        id: attendee.id,
        name: attendee.name,
        wins: 0,
        losses: 0,
        winRate: 0,
        bestTeammate: null,
        totalGames: 0,
      });
    });

    // Calculate stats from games
    games.forEach(game => {
      const team1Players = [game.team1Player1Id, game.team1Player2Id].filter((id): id is string => Boolean(id));
      const team2Players = [game.team2Player1Id, game.team2Player2Id].filter((id): id is string => Boolean(id));
      
      const team1Won = game.winner === 'team1';
      
      // Update team 1 stats
      team1Players.forEach(playerId => {
        const player = stats.get(playerId);
        if (player) {
          player.totalGames++;
          if (team1Won) {
            player.wins++;
          } else {
            player.losses++;
          }
        }
      });
      
      // Update team 2 stats
      team2Players.forEach(playerId => {
        const player = stats.get(playerId);
        if (player) {
          player.totalGames++;
          if (!team1Won) {
            player.wins++;
          } else {
            player.losses++;
          }
        }
      });
    });

    // Calculate win rates and best teammates
    stats.forEach(player => {
      player.winRate = player.totalGames > 0 ? (player.wins / player.totalGames) * 100 : 0;
      
      // Find best teammate
      const teammateStats = new Map<string, { wins: number; totalGames: number }>();
      
      games.forEach(game => {
        const team1Players = [game.team1Player1Id, game.team1Player2Id].filter((id): id is string => Boolean(id));
        const team2Players = [game.team2Player1Id, game.team2Player2Id].filter((id): id is string => Boolean(id));
        
        if (team1Players.includes(player.id)) {
          team1Players.forEach(teammateId => {
            if (teammateId !== player.id) {
              const current = teammateStats.get(teammateId) || { wins: 0, totalGames: 0 };
              current.totalGames++;
              if (game.winner === 'team1') current.wins++;
              teammateStats.set(teammateId, current);
            }
          });
        } else if (team2Players.includes(player.id)) {
          team2Players.forEach(teammateId => {
            if (teammateId !== player.id) {
              const current = teammateStats.get(teammateId) || { wins: 0, totalGames: 0 };
              current.totalGames++;
              if (game.winner === 'team2') current.wins++;
              teammateStats.set(teammateId, current);
            }
          });
        }
      });
      
      // Find teammate with best win rate
      let bestTeammate: PlayerStats['bestTeammate'] = null;
      let bestWinRate = 0;
      
      teammateStats.forEach((stats, teammateId) => {
        const winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          const teammate = attendees.find(a => a.id === teammateId);
          bestTeammate = teammate ? {
            id: teammate.id,
            name: teammate.name,
            wins: stats.wins,
            totalGames: stats.totalGames,
          } : null;
        }
      });
      
      player.bestTeammate = bestTeammate;
    });

    return Array.from(stats.values());
  }, [games, attendees]);

  // Sort player stats
  const sortedPlayerStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'wins':
          aValue = a.wins;
          bValue = b.wins;
          break;
        case 'losses':
          aValue = a.losses;
          bValue = b.losses;
          break;
        case 'winRate':
          aValue = a.winRate;
          bValue = b.winRate;
          break;
        case 'totalGames':
          aValue = a.totalGames;
          bValue = b.totalGames;
          break;
        case 'bestTeammate':
          aValue = a.bestTeammate ? (a.bestTeammate.wins / a.bestTeammate.totalGames) * 100 : 0;
          bValue = b.bestTeammate ? (b.bestTeammate.wins / b.bestTeammate.totalGames) * 100 : 0;
          break;
        default:
          aValue = a.winRate;
          bValue = b.winRate;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [playerStats, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  }

  useEffect(() => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  // Default time to current time when opening the add game modal
  useEffect(() => {
    if (showAddForm) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
    }
  }, [showAddForm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team1Player1Id || !team2Player1Id) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/pickleball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time: time || undefined,
          location: location || undefined,
          team1Player1Id,
          team1Player2Id: team1Player2Id || undefined,
          team2Player1Id,
          team2Player2Id: team2Player2Id || undefined,
          team1Score,
          team2Score,
          notes: notes || undefined,
        }),
      });
      
      if (response.ok) {
        mutate();
        setShowAddForm(false);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]);
    setTime('');
    setLocation('');
    setTeam1Player1Id('');
    setTeam1Player2Id('');
    setTeam2Player1Id('');
    setTeam2Player2Id('');
    setTeam1Score(0);
    setTeam2Score(0);
    setNotes('');
  }

  function handleDeleteClick(game: PickleballGame) {
    setGameToDelete(game);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!gameToDelete) return;
    
    const response = await fetch(`/api/pickleball/${gameToDelete.id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      mutate();
      setShowDeleteModal(false);
      setGameToDelete(null);
    }
  }

  function cancelDelete() {
    setShowDeleteModal(false);
    setGameToDelete(null);
  }

  function getAttendeeName(id: string) {
    return attendees.find(a => a.id === id)?.name || 'Unknown';
  }

  function formatGameTime(time?: string) {
    if (!time) return '';
    return time;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm bg-white dark:bg-zinc-900">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Pickleball</h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => setView('games')}
              className={`px-3 py-1.5 text-sm rounded-l-lg ${
                view === 'games'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-3 py-1.5 text-sm rounded-r-lg ${
                view === 'summary'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Summary
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-sm"
          >
            Add Game
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Add Pickleball Game</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  required
                />
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                />
              </div>
              
              <input
                type="text"
                placeholder="Location (optional)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              />

              <div className="space-y-3">
                <h5 className="font-medium">Team 1</h5>
                <select
                  value={team1Player1Id}
                  onChange={e => setTeam1Player1Id(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
                  required
                >
                  <option value="">Select Player 1</option>
                  {attendees.map(attendee => (
                    <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
                  ))}
                </select>
                <select
                  value={team1Player2Id}
                  onChange={e => setTeam1Player2Id(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
                >
                  <option value="">Select Player 2 (optional)</option>
                  {attendees.map(attendee => (
                    <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium">Team 2</h5>
                <select
                  value={team2Player1Id}
                  onChange={e => setTeam2Player1Id(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
                  required
                >
                  <option value="">Select Player 1</option>
                  {attendees.map(attendee => (
                    <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
                  ))}
                </select>
                <select
                  value={team2Player2Id}
                  onChange={e => setTeam2Player2Id(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
                >
                  <option value="">Select Player 2 (optional)</option>
                  {attendees.map(attendee => (
                    <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Team 1 Score</label>
                  <input
                    type="number"
                    min="0"
                    value={team1Score}
                    onChange={e => setTeam1Score(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team 2 Score</label>
                  <input
                    type="number"
                    min="0"
                    value={team2Score}
                    onChange={e => setTeam2Score(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                    required
                  />
                </div>
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                rows={3}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-sm"
                >
                  {saving ? 'Saving…' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {showDeleteModal && gameToDelete && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
             <h4 className="text-lg font-semibold mb-4">Delete Game</h4>
             <p className="text-sm mb-6">
               Are you sure you want to delete the game from {formatDate(gameToDelete.date)}
               {gameToDelete.time && ` at ${formatGameTime(gameToDelete.time)}`}?
             </p>
             <div className="flex justify-end gap-2">
               <button
                 onClick={cancelDelete}
                 className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
               >
                 Cancel
               </button>
               <button
                 onClick={confirmDelete}
                 className="rounded-md bg-red-600 hover:bg-red-500 text-white font-medium px-3 py-1.5 text-sm"
               >
                 Delete
               </button>
             </div>
           </div>
         </div>
               )}

        {view === 'summary' && (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-red-500">Error loading games: {error.message}</p>
            )}
            {sortedPlayerStats.length === 0 ? (
              <p className="text-sm opacity-70">No players found. Add some games first!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-2 px-3">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 hover:text-indigo-600"
                        >
                          Player <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="text-center py-2 px-3">
                        <button
                          onClick={() => handleSort('totalGames')}
                          className="flex items-center justify-center gap-1 hover:text-indigo-600"
                        >
                          Games <SortIcon field="totalGames" />
                        </button>
                      </th>
                      <th className="text-center py-2 px-3">
                        <button
                          onClick={() => handleSort('wins')}
                          className="flex items-center justify-center gap-1 hover:text-indigo-600"
                        >
                          Wins <SortIcon field="wins" />
                        </button>
                      </th>
                      <th className="text-center py-2 px-3">
                        <button
                          onClick={() => handleSort('losses')}
                          className="flex items-center justify-center gap-1 hover:text-indigo-600"
                        >
                          Losses <SortIcon field="losses" />
                        </button>
                      </th>
                      <th className="text-center py-2 px-3">
                        <button
                          onClick={() => handleSort('winRate')}
                          className="flex items-center justify-center gap-1 hover:text-indigo-600"
                        >
                          Win Rate <SortIcon field="winRate" />
                        </button>
                      </th>
                      <th className="text-left py-2 px-3">
                        <button
                          onClick={() => handleSort('bestTeammate')}
                          className="flex items-center gap-1 hover:text-indigo-600"
                        >
                          Best Teammate <SortIcon field="bestTeammate" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayerStats.map((player) => (
                      <tr key={player.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <td className="py-3 px-3 font-medium">{player.name}</td>
                        <td className="py-3 px-3 text-center">{player.totalGames}</td>
                        <td className="py-3 px-3 text-center text-green-600 dark:text-green-400">{player.wins}</td>
                        <td className="py-3 px-3 text-center text-red-600 dark:text-red-400">{player.losses}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-medium ${player.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {player.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {player.bestTeammate ? (
                            <div>
                              <div className="font-medium">{player.bestTeammate.name}</div>
                              <div className="text-xs opacity-70">
                                {player.bestTeammate.wins}/{player.bestTeammate.totalGames} games ({((player.bestTeammate.wins / player.bestTeammate.totalGames) * 100).toFixed(1)}%)
                              </div>
                            </div>
                          ) : (
                            <span className="opacity-50">No teammates</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'games' && (
          <div className="space-y-4">
         {error && (
           <p className="text-sm text-red-500">Error loading games: {error.message}</p>
         )}
         {games.length === 0 && !error ? (
           <p className="text-sm opacity-70">No games recorded yet. Add the first game!</p>
         ) : (
          games.map(game => (
            <div key={game.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium">
                    {formatDate(game.date)}
                    {game.time && ` at ${formatGameTime(game.time)}`}
                  </div>
                  {game.location && (
                    <div className="text-sm opacity-70">{game.location}</div>
                  )}
                </div>
                                 <button
                   onClick={() => handleDeleteClick(game)}
                   className="text-red-500 hover:text-red-700 text-sm"
                 >
                   🗑️
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className={`p-3 rounded-lg ${game.winner === 'team1' ? 'bg-green-100 dark:bg-green-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                  <div className="font-medium">Team 1</div>
                  <div className="text-sm">
                    {getAttendeeName(game.team1Player1Id)}
                    {game.team1Player2Id && ` & ${getAttendeeName(game.team1Player2Id)}`}
                  </div>
                  <div className="text-lg font-bold">{game.team1Score}</div>
                </div>
                <div className={`p-3 rounded-lg ${game.winner === 'team2' ? 'bg-green-100 dark:bg-green-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                  <div className="font-medium">Team 2</div>
                  <div className="text-sm">
                    {getAttendeeName(game.team2Player1Id)}
                    {game.team2Player2Id && ` & ${getAttendeeName(game.team2Player2Id)}`}
                  </div>
                  <div className="text-lg font-bold">{game.team2Score}</div>
                </div>
              </div>

              {game.notes && (
                <div className="text-sm opacity-70 italic">&ldquo;{game.notes}&rdquo;</div>
              )}
                         </div>
           ))
         )}
       </div>
        )}
     </div>
   );
 }
