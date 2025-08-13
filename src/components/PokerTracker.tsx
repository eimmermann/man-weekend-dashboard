"use client";
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { Attendee } from '@/types';

type PokerGame = {
  id: string;
  date: string;
  time?: string;
  status?: 'active' | 'finished';
  createdAt: string;
  players: { id: string; gameId: string; attendeeId: string; buyIn: number; cashOut: number; status?: 'active' | 'finished' }[];
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PokerTracker() {
  const [view, setView] = useState<'games' | 'summary' | 'bill'>('games');
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data: games = undefined, mutate } = useSWR<PokerGame[]>('/api/poker', fetcher);
  const { data: settlement, mutate: mutateSettlement } = useSWR<{ summary: { attendeeId: string; net: number }[]; transfers: { fromAttendeeId: string; toAttendeeId: string; amount: number }[] }>(
    '/api/poker/settlement', fetcher
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rows, setRows] = useState<Array<{ attendeeId: string; buyIn: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [paidTransfers, setPaidTransfers] = useState<Record<string, boolean>>({});

  type PlayerSortField = 'name' | 'buyIn' | 'cashOut' | 'net';
  type SortDir = 'asc' | 'desc';
  const [playerSort, setPlayerSort] = useState<Record<string, { field: PlayerSortField; dir: SortDir }>>({});
  const [rebuyModal, setRebuyModal] = useState<null | { gameId: string; playerId: string }>(null);
  const [cashOutModal, setCashOutModal] = useState<null | { gameId: string; playerId: string }>(null);
  const [amount, setAmount] = useState<string>('');
  const [deleteModal, setDeleteModal] = useState<null | { gameId: string }>(null);
  const [finishBlockModal, setFinishBlockModal] = useState<null | { amount: number }>(null);

  const attendeeName = (id: string) => attendees.find(a => a.id === id)?.name || 'Unknown';
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

  // const addRow = () => setRows(prev => [...prev, { attendeeId: attendees[0]?.id || '', buyIn: 20 }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  // Auto-create a row for every attendee once attendees are loaded
  useEffect(() => {
    if (isModalOpen && attendees.length > 0 && rows.length === 0) {
      setRows(attendees.map(a => ({ attendeeId: a.id, buyIn: 20 })));
    }
  }, [attendees, rows.length, isModalOpen]);

  // Default date/time when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (!date) setDate(new Date().toISOString().split('T')[0]);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
    }
  }, [isModalOpen, date]);

  const createGame = async () => {
    if (!date || rows.length === 0) return;
    setSaving(true);
    try {
      // create with buy-ins only; cashOut defaults to 0
      const res = await fetch('/api/poker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, time, players: rows.map(r => ({ attendeeId: r.attendeeId, buyIn: r.buyIn, cashOut: 0 })) }) });
      if (!res.ok) throw new Error('Failed');
      await mutate();
      setDate('');
      setTime('');
      setRows([]);
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const summaryByAttendee = useMemo(() => settlement?.summary || [], [settlement]);
  const transfers = useMemo(() => settlement?.transfers || [], [settlement]);

  const gamesList: PokerGame[] = Array.isArray(games) ? games : [];

  // function canGameBeFinished(game: PokerGame): boolean {
  //   const allPlayersFinished = (game.players || []).every((p) => (p as { status?: 'active' | 'finished' }).status === 'finished');
  //   const totalNet = (game.players || []).reduce((sum: number, p) => sum + (Number((p as { cashOut: number }).cashOut) - Number((p as { buyIn: number }).buyIn)), 0);
  //   const rounded = Math.round(totalNet * 100) / 100;
  //   return allPlayersFinished && rounded === 0;
  // }

  // Recalculate settlement when switching to Summary/Bill tabs
  useEffect(() => {
    if (view === 'summary' || view === 'bill') {
      mutateSettlement();
    }
  }, [view, mutateSettlement]);

  function sortedPlayers(game: PokerGame) {
    const sort = playerSort[game.id] ?? { field: 'name' as PlayerSortField, dir: 'asc' as SortDir };
    const items = game.players.map(p => ({
      ...p,
      name: attendeeName(p.attendeeId),
      net: Number((p.cashOut - p.buyIn).toFixed(2)),
      status: (p.status ?? 'active') as 'active' | 'finished',
    }));
    items.sort((a, b) => {
      let av: string | number = a.name.toLowerCase();
      let bv: string | number = b.name.toLowerCase();
      if (sort.field === 'buyIn') { av = a.buyIn; bv = b.buyIn; }
      else if (sort.field === 'cashOut') { av = a.cashOut; bv = b.cashOut; }
      else if (sort.field === 'net') { av = a.net; bv = b.net; }
      if (av === bv) return 0;
      const res = (av as any) > (bv as any) ? 1 : -1;
      return sort.dir === 'asc' ? res : -res;
    });
    return items;
  }

  function togglePlayerSort(gameId: string, field: PlayerSortField) {
    setPlayerSort(prev => {
      const current = prev[gameId] ?? { field: 'name' as PlayerSortField, dir: 'asc' as SortDir };
      if (current.field === field) {
        return { ...prev, [gameId]: { field, dir: current.dir === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [gameId]: { field, dir: 'asc' } };
    });
  }

  async function handleDeleteGame(gameId: string) {
    await fetch(`/api/poker?id=${encodeURIComponent(gameId)}`, { method: 'DELETE' });
    mutate();
  }

  async function handleFinishGame(gameId: string) {
    // Prevent finishing if any player is still active
    const game = gamesList.find(g => g.id === gameId);
    if (!game) return;
    const anyActive = game.players.some(p => (p as { status?: 'active' | 'finished' }).status !== 'finished');
    if (anyActive) {
      alert('All players must be finished before marking the game as finished.');
      return;
    }
      const totalNet = game.players.reduce((sum, p) => sum + (Number((p as { cashOut: number }).cashOut) - Number((p as { buyIn: number }).buyIn)), 0);
    const rounded = Math.round(totalNet * 100) / 100;
    if (rounded !== 0) {
      setFinishBlockModal({ amount: rounded });
      return;
    }
    await fetch(`/api/poker?id=${encodeURIComponent(gameId)}&status=finished`, { method: 'PATCH' });
    await mutate();
    mutateSettlement();
  }

  async function handleReopenGame(gameId: string) {
    await fetch(`/api/poker?id=${encodeURIComponent(gameId)}&status=active`, { method: 'PATCH' });
    await mutate();
    mutateSettlement();
  }

  function openRebuy(gameId: string, playerId: string) {
    setAmount('20.00');
    setRebuyModal({ gameId, playerId });
  }

  function openCashOut(gameId: string, playerId: string) {
    const { game, player } = findPlayer(gameId, playerId);
    if (game && player) {
      const totalNet = game.players.reduce((sum, p: any) => sum + (Number(p.cashOut) - Number(p.buyIn)), 0);
      const suggested = Number((Number(player.cashOut) - totalNet).toFixed(2));
      const clamped = Math.max(0, suggested);
      setAmount(clamped.toFixed(2));
    } else {
      setAmount('');
    }
    setCashOutModal({ gameId, playerId });
  }

  function findPlayer(gameId: string, playerId: string) {
    const game = gamesList.find(g => g.id === gameId);
    const player = game?.players.find(p => p.id === playerId);
    return { game, player };
  }

  async function confirmRebuy() {
    if (!rebuyModal) return;
    const { game, player } = findPlayer(rebuyModal.gameId, rebuyModal.playerId);
    if (!game || !player) return;
    const add = Math.max(0, Number(amount) || 0);
    const body = { id: player.id, attendeeId: player.attendeeId, buyIn: Number((player.buyIn + add).toFixed(2)), cashOut: player.cashOut, status: 'active' as const };
    await fetch(`/api/poker/${encodeURIComponent(game.id)}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setRebuyModal(null);
    await mutate();
    mutateSettlement();
  }

  async function confirmCashOut() {
    if (!cashOutModal) return;
    const { game, player } = findPlayer(cashOutModal.gameId, cashOutModal.playerId);
    if (!game || !player) return;
    const amt = Math.max(0, Number(amount) || 0);
    const body = { id: player.id, attendeeId: player.attendeeId, buyIn: player.buyIn, cashOut: Number(amt.toFixed(2)), status: 'finished' as const };
    await fetch(`/api/poker/${encodeURIComponent(game.id)}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setCashOutModal(null);
    await mutate();
    mutateSettlement();
  }
  
  async function handleBust(gameId: string, playerId: string) {
    const { game, player } = findPlayer(gameId, playerId);
    if (!game || !player) return;
    const body = { id: player.id, attendeeId: player.attendeeId, buyIn: player.buyIn, cashOut: 0, status: 'finished' as const };
    await fetch(`/api/poker/${encodeURIComponent(game.id)}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await mutate();
    mutateSettlement();
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Poker</h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg ring-1 ring-white/10 bg-white/5">
            <button onClick={() => setView('games')} className={`px-3 py-1.5 text-sm rounded-l-lg ${view === 'games' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' : 'hover:bg-white/10'}`}>Games</button>
            <button onClick={() => setView('summary')} className={`px-3 py-1.5 text-sm ${view === 'summary' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' : 'hover:bg-white/10'}`}>Summary</button>
            <button onClick={() => setView('bill')} className={`px-3 py-1.5 text-sm rounded-r-lg ${view === 'bill' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' : 'hover:bg-white/10'}`}>Bill</button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-1.5 text-sm">Add Game</button>
        </div>
      </div>

             {view === 'games' && (
         <div className="space-y-4">
          <div className="space-y-4">
            {gamesList.map(g => (
              <div key={g.id} className="rounded-xl p-4 bg-white/5 backdrop-blur-lg ring-1 ring-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{g.date}{g.time ? ` ${g.time}` : ''}</div>
                    <div className="text-xs mt-0.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full ring-1 ring-white/15 ${g.status === 'finished' ? 'bg-white/10' : 'bg-emerald-500/20 text-emerald-300'}`}>{g.status === 'finished' ? 'Finished' : 'Active'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.status === 'finished' ? (
                      <button onClick={() => handleReopenGame(g.id)} className="rounded-md ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-xs">Reopen</button>
                    ) : (
                      <button onClick={() => handleFinishGame(g.id)} className="rounded-md ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-xs">Mark Finished</button>
                    )}
                    <button onClick={() => setDeleteModal({ gameId: g.id })} className="rounded-md ring-1 ring-rose-400/40 text-rose-300 px-2 py-1 text-xs">Delete</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="py-2 px-2">
                          <button onClick={() => togglePlayerSort(g.id, 'name')} className="hover:text-indigo-600">Player</button>
                        </th>
                        <th className="py-2 px-2 text-right">
                          <button onClick={() => togglePlayerSort(g.id, 'buyIn')} className="hover:text-indigo-600">Buy-in</button>
                        </th>
                        <th className="py-2 px-2 text-right">
                          <button onClick={() => togglePlayerSort(g.id, 'cashOut')} className="hover:text-indigo-600">Cash-out</button>
                        </th>
                        <th className="py-2 px-2 text-right">
                          <button onClick={() => togglePlayerSort(g.id, 'net')} className="hover:text-indigo-600">Net</button>
                        </th>
                        {g.status !== 'finished' && (
                          <th className="py-2 px-2 text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers(g).length === 0 && (
                        <tr>
                          <td colSpan={g.status !== 'finished' ? 5 : 4} className="py-3 px-2 text-sm opacity-70">No players to display.</td>
                        </tr>
                      )}
                      {sortedPlayers(g).map(p => (
                         <tr key={p.id} className="border-b border-white/10">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-white/15 ${p.status === 'finished' ? 'bg-white/10' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                {p.status === 'finished' ? 'Finished' : 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">{formatCurrency(p.buyIn)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(p.cashOut)}</td>
                          <td className={`py-2 px-2 text-right ${p.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(p.net)}</td>
                          {g.status !== 'finished' && (
                            <td className="py-2 px-2 text-right">
                              <div className="inline-flex gap-2">
                                {p.status === 'active' ? (
                                  <>
                                    <button onClick={() => openCashOut(g.id, p.id)} className="rounded-md bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-2 py-1 text-xs">Cash Out</button>
                                    <button onClick={() => handleBust(g.id, p.id)} className="rounded-md bg-rose-600/80 hover:bg-rose-600 text-white px-2 py-1 text-xs">Bust</button>
                                  </>
                                ) : (
                                  <button onClick={() => openRebuy(g.id, p.id)} className="rounded-md bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-2 py-1 text-xs">Rebuy</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {sortedPlayers(g).length > 0 && (
                        <tr>
                          <td className="py-2 px-2 font-semibold text-right">Totals:</td>
                          <td className="py-2 px-2 text-right font-semibold">
                            {formatCurrency(sortedPlayers(g).reduce((sum, p) => sum + p.buyIn, 0))}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold">
                            {formatCurrency(sortedPlayers(g).reduce((sum, p) => sum + p.cashOut, 0))}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold">
                            {formatCurrency(sortedPlayers(g).reduce((sum, p) => sum + p.net, 0))}
                          </td>
                          {g.status !== 'finished' && <td />}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
              <div className="relative z-10 w-[min(640px,92vw)] rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">New Poker Game</div>
                  <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">×</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Date and Time</label>
                    <div className="grid grid-cols-2 gap-3">
                       <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-md ring-1 ring-white/10 bg-transparent px-3 py-1.5 text-sm w-full" />
                       <input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-md ring-1 ring-white/10 bg-transparent px-3 py-1.5 text-sm w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-[minmax(10rem,1fr)_120px_40px] gap-2 text-xs uppercase tracking-wide opacity-70 mb-1">
                      <div>Attendee</div>
                      <div>Buy-in</div>
                      <div></div>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                      {rows.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-[minmax(10rem,1fr)_120px_40px] gap-2 items-center">
                           <select value={r.attendeeId} onChange={e => setRows(prev => prev.map((p, i) => i === idx ? { ...p, attendeeId: e.target.value } : p))} className="rounded-md ring-1 ring-white/10 bg-transparent px-2 py-1 text-sm">
                            {attendees.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                          </select>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">$</span>
                             <input type="number" min={0} step={0.01} placeholder="0.00" value={r.buyIn} onChange={e => setRows(prev => prev.map((p, i) => i === idx ? { ...p, buyIn: Number(e.target.value) } : p))} className="rounded-md ring-1 ring-white/10 bg-transparent pl-5 pr-2 py-1 text-sm w-full" />
                          </div>
                          <button onClick={() => removeRow(idx)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-rose-600 hover:text-rose-500" aria-label="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                     <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                     <button onClick={createGame} disabled={saving || !date || rows.length === 0} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm disabled:opacity-50">Create Game</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(rebuyModal || cashOutModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setRebuyModal(null); setCashOutModal(null); }} />
          <div className="relative z-10 w-[min(420px,92vw)] rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{rebuyModal ? 'Rebuy' : 'Cash Out'}</div>
              <button onClick={() => { setRebuyModal(null); setCashOutModal(null); }} className="text-zinc-500 hover:text-zinc-700">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">$</span>
                  <input type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(e.target.value)} className="rounded-md ring-1 ring-white/10 bg-transparent pl-5 pr-2 py-1.5 text-sm w-full" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setRebuyModal(null); setCashOutModal(null); }} className="px-3 py-1.5 rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                {rebuyModal ? (
                  <button onClick={confirmRebuy} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm">Add Rebuy</button>
                ) : (
                  <button onClick={confirmCashOut} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm">Set Cash Out</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModal(null)} />
          <div className="relative z-10 w-[min(440px,92vw)] rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Delete Game</div>
              <button onClick={() => setDeleteModal(null)} className="text-zinc-500 hover:text-zinc-700">×</button>
            </div>
            <div className="space-y-4">
              <p className="text-sm">Are you sure you want to delete this game? This action cannot be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                <button onClick={async () => { if (deleteModal) { await handleDeleteGame(deleteModal.gameId); setDeleteModal(null); } }} className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-sm">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {finishBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFinishBlockModal(null)} />
          <div className="relative z-10 w-[min(440px,92vw)] rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Cannot Finish Game</div>
              <button onClick={() => setFinishBlockModal(null)} className="text-zinc-500 hover:text-zinc-700">×</button>
            </div>
            <div className="space-y-4">
              <p className="text-sm">Net total must be exactly $0.00 to finish the game.</p>
              <p className="text-sm">Current net total: <span className={`${finishBlockModal.amount === 0 ? '' : (finishBlockModal.amount > 0 ? 'text-emerald-400' : 'text-rose-400')}`}>{formatCurrency(finishBlockModal.amount)}</span></p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setFinishBlockModal(null)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'summary' && (
        <div className="space-y-2">
          {summaryByAttendee.map(s => (
            <div key={s.attendeeId} className="flex items-center justify-between rounded-md ring-1 ring-white/10 bg-white/5 px-3 py-2">
              <div className="font-medium">{attendeeName(s.attendeeId)}</div>
              <div className={s.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatCurrency(s.net)}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'bill' && (
        <div className="space-y-3">
          {transfers.map(t => {
            const key = `${t.fromAttendeeId}->${t.toAttendeeId}`;
            const paid = !!paidTransfers[key];
            return (
              <div key={key} className={`flex items-center justify-between rounded-md border px-3 py-2 ${paid ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-zinc-200 dark:border-zinc-800'}`}>
                <div>
                  <div className="text-sm">{attendeeName(t.fromAttendeeId)} pays {attendeeName(t.toAttendeeId)}</div>
                  <div className="font-semibold">{formatCurrency(t.amount)}</div>
                </div>
                <button onClick={() => setPaidTransfers(prev => ({ ...prev, [key]: !prev[key] }))} className={`px-3 py-1.5 rounded-md text-sm ${paid ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>{paid ? 'Paid' : 'Mark Paid'}</button>
              </div>
            );
          })}
          {transfers.length === 0 && (
            <div className="text-sm opacity-70">Everyone is already settled up.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-sm ${active ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>{label}</button>
  );
}


