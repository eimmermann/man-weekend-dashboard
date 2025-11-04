"use client";

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { useYear } from '@/context/YearContext';
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
  const { year } = useYear();
  const [sortField, setSortField] = useState<SortField>('winRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { data: games = [], mutate, error } = useSWR<PickleballGame[]>(`/api/pickleball?year=${year}`, fetcher);
  const { data: attendees = [] } = useSWR<Attendee[]>(`/api/attendees?year=${year}`, fetcher);

  // Debug logging
  console.log('PickleballTracker - games:', games);
  console.log('PickleballTracker - error:', error);

  const [team1Player1Id, setTeam1Player1Id] = useState('');
  const [team1Player2Id, setTeam1Player2Id] = useState('');
  const [team2Player1Id, setTeam2Player1Id] = useState('');
  const [team2Player2Id, setTeam2Player2Id] = useState('');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

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
    setHasMounted(true);
  }, []);

  // Default teams from previous game when opening the add game modal
  useEffect(() => {
    if (showAddForm) {
      // Default teams from the most recent game
      if (games.length > 0) {
        const lastGame = games[0]; // Assuming games are sorted by most recent first
        setTeam1Player1Id(lastGame.team1Player1Id);
        setTeam1Player2Id(lastGame.team1Player2Id || '');
        setTeam2Player1Id(lastGame.team2Player1Id);
        setTeam2Player2Id(lastGame.team2Player2Id || '');
      }
      
      // Scroll to top and prevent body scrolling when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scrolling when modal closes
      document.body.style.overflow = 'unset';
    }
  }, [showAddForm, games]);

  // Cleanup effect to restore body scroll if component unmounts with modal open
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team1Player1Id || !team2Player1Id) return;
    
    // Always use current date and time when submitting
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setSaving(true);
    try {
      const response = await fetch('/api/pickleball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDate,
          time: currentTime,
          team1Player1Id,
          team1Player2Id: team1Player2Id || undefined,
          team2Player1Id,
          team2Player2Id: team2Player2Id || undefined,
          team1Score,
          team2Score,
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
    setTeam1Player1Id('');
    setTeam1Player2Id('');
    setTeam2Player1Id('');
    setTeam2Player2Id('');
    setTeam1Score(0);
    setTeam2Score(0);
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
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Pickleball</h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg ring-1 ring-white/10 bg-white/5">
            <button
              onClick={() => setView('games')}
              className={`px-3 py-1.5 text-sm rounded-l-lg ${
                view === 'games'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white'
                  : 'hover:bg-white/10'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-3 py-1.5 text-sm rounded-r-lg ${
                view === 'summary'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white'
                  : 'hover:bg-white/10'
              }`}
            >
              Summary
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-1.5 text-sm"
          >
            Add Game
          </button>
        </div>
      </div>

      {showAddForm && hasMounted && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 min-h-screen" onClick={() => setShowAddForm(false)}>
          <div className="bg-zinc-900/95 backdrop-blur-xl ring-1 ring-white/20 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-white">Add Pickleball Game</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/60 hover:text-white/90 text-2xl leading-none p-1 transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <h5 className="font-medium text-white/90 text-base">Team 1</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white/80">Player 1</label>
                    <select
                      value={team1Player1Id}
                      onChange={e => setTeam1Player1Id(e.target.value)}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    >
                      <option value="" className="bg-zinc-800 text-white">Select Player 1</option>
                      {attendees.map(attendee => (
                        <option key={attendee.id} value={attendee.id} className="bg-zinc-800 text-white">{attendee.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white/80">Player 2 (optional)</label>
                    <select
                      value={team1Player2Id}
                      onChange={e => setTeam1Player2Id(e.target.value)}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="" className="bg-zinc-800 text-white">Select Player 2 (optional)</option>
                      {attendees.map(attendee => (
                        <option key={attendee.id} value={attendee.id} className="bg-zinc-800 text-white">{attendee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-medium text-white/90 text-base">Team 2</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white/80">Player 1</label>
                    <select
                      value={team2Player1Id}
                      onChange={e => setTeam2Player1Id(e.target.value)}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    >
                      <option value="" className="bg-zinc-800 text-white">Select Player 1</option>
                      {attendees.map(attendee => (
                        <option key={attendee.id} value={attendee.id} className="bg-zinc-800 text-white">{attendee.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white/80">Player 2 (optional)</label>
                    <select
                      value={team2Player2Id}
                      onChange={e => setTeam2Player2Id(e.target.value)}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="" className="bg-zinc-800 text-white">Select Player 2 (optional)</option>
                      {attendees.map(attendee => (
                        <option key={attendee.id} value={attendee.id} className="bg-zinc-800 text-white">{attendee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/90">Team 1 Score</label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      min="0"
                      value={team1Score}
                      onChange={e => setTeam1Score(parseInt(e.target.value) || 0)}
                      onFocus={e => (e.target as HTMLInputElement).select()}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                    <div className="flex gap-1 justify-center">
                      {[11, 15, 21].map(score => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setTeam1Score(score)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            team1Score === score 
                              ? 'bg-indigo-500 text-white' 
                              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/90">Team 2 Score</label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      min="0"
                      value={team2Score}
                      onChange={e => setTeam2Score(parseInt(e.target.value) || 0)}
                      onFocus={e => (e.target as HTMLInputElement).select()}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      className="w-full rounded-lg ring-1 ring-white/20 bg-white/10 px-4 py-3 text-white text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                    <div className="flex gap-1 justify-center">
                      {[11, 15, 21].map(score => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setTeam2Score(score)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            team2Score === score 
                              ? 'bg-indigo-500 text-white' 
                              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium px-8 py-3 text-base transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

       {showDeleteModal && gameToDelete && (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
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
            <div key={game.id} className="rounded-xl p-4 bg-white/5 backdrop-blur-lg ring-1 ring-white/10">
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
                   className="text-rose-300 hover:text-rose-200 text-sm"
                 >
                   🗑️
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className={`p-3 rounded-lg ring-1 ring-white/10 ${game.winner === 'team1' ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
                  <div className="font-medium">Team 1</div>
                  <div className="text-sm">
                    {getAttendeeName(game.team1Player1Id)}
                    {game.team1Player2Id && ` & ${getAttendeeName(game.team1Player2Id)}`}
                  </div>
                  <div className="text-lg font-bold">{game.team1Score}</div>
                </div>
                <div className={`p-3 rounded-lg ring-1 ring-white/10 ${game.winner === 'team2' ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
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
