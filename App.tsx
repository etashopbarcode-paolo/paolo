import React, { useState, useEffect, useMemo } from 'react';
import { Match, MatchResult, PlayerColor, OpponentStats } from './types';
import { PlusIcon, TrophyIcon, XIcon, UserIcon, CrownIcon, ArrowLeftIcon } from './constants';

const INITIAL_OPPONENTS = ['Pele'];

// --- Helpers for Display (Moved outside component) ---

const getResultLabel = (result: MatchResult) => {
  if (result === MatchResult.DRAW) return 'Patta';
  if (result === MatchResult.WIN) return 'Vittoria';
  if (result === MatchResult.LOSS) return 'Sconfitta';
  return 'In Corso';
};

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- Sub-Components (Moved outside component) ---

const MatchCard: React.FC<{ match: Match; onClick: (match: Match) => void }> = ({ match, onClick }) => {
  const isPending = match.result === MatchResult.PENDING;
  
  // Logic for name coloring based on result
  let ioColorClass = 'text-slate-800';
  let oppColorClass = 'text-slate-800';
  let resultBadgeClass = 'bg-slate-100 text-slate-500';

  if (!isPending) {
    if (match.result === MatchResult.WIN) {
      ioColorClass = 'text-emerald-600 font-bold';
      oppColorClass = 'text-rose-600 font-normal opacity-80';
      resultBadgeClass = 'bg-emerald-100 text-emerald-700';
    } else if (match.result === MatchResult.LOSS) {
      ioColorClass = 'text-rose-600 font-normal opacity-80';
      oppColorClass = 'text-emerald-600 font-bold';
      resultBadgeClass = 'bg-rose-100 text-rose-700';
    } else if (match.result === MatchResult.DRAW) {
      ioColorClass = 'text-amber-600 font-bold';
      oppColorClass = 'text-amber-600 font-bold';
      resultBadgeClass = 'bg-amber-100 text-amber-700';
    }
  } else {
    // Pending styling
    ioColorClass = 'text-slate-900 font-medium';
    oppColorClass = 'text-slate-900 font-medium';
    resultBadgeClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse';
  }

  const containerClass = isPending 
    ? 'border-2 border-yellow-400 bg-yellow-50 cursor-pointer shadow-md' 
    : 'border border-slate-200 bg-white opacity-90';

  return (
    <div 
      onClick={() => isPending && onClick(match)}
      className={`relative mb-3 rounded-xl p-4 transition-all ${containerClass}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-400 font-mono">{formatDate(match.timestamp)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${resultBadgeClass}`}>
          {getResultLabel(match.result)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* PLAYER: IO */}
        <div className="flex flex-col items-start flex-1">
          <span className={`text-lg ${ioColorClass}`}>Io</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full border ${match.userColor === 'white' ? 'bg-white border-slate-400' : 'bg-black border-black'}`}></span>
            {match.userColor === 'white' ? 'Bianco' : 'Nero'}
          </span>
        </div>

        <div className="text-slate-300 font-light text-sm">VS</div>

        {/* PLAYER: OPPONENT */}
        <div className="flex flex-col items-end flex-1">
          <span className={`text-lg ${oppColorClass} text-right`}>{match.opponentName}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
             {match.userColor === 'white' ? 'Nero' : 'Bianco'}
             <span className={`w-2 h-2 rounded-full border ${match.userColor === 'white' ? 'bg-black border-black' : 'bg-white border-slate-400'}`}></span>
          </span>
        </div>
      </div>
      
      {isPending && (
        <div className="mt-3 text-center text-sm font-bold text-indigo-600 bg-indigo-50 py-1 rounded border border-indigo-100">
          Tocca per chiudere la partita
        </div>
      )}
    </div>
  );
};

export default function App() {
  // --- State ---
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('chess_matches');
    return saved ? JSON.parse(saved) : [];
  });

  const [opponents, setOpponents] = useState<string[]>(() => {
    const saved = localStorage.getItem('chess_opponents');
    return saved ? JSON.parse(saved) : INITIAL_OPPONENTS;
  });

  // Views: 'list' (home), 'add_select_opponent', 'resolve_match', 'scoreboard'
  const [currentView, setCurrentView] = useState<'list' | 'add_select_opponent' | 'resolve_match' | 'scoreboard'>('list');
  
  // Temporary state for the flow
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [newOpponentName, setNewOpponentName] = useState('');
  
  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('chess_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('chess_opponents', JSON.stringify(opponents));
  }, [opponents]);

  // --- Derived State ---
  
  // Determines user color based on logic: "White is the one who played Black last"
  const determineColors = (opponent: string): { user: PlayerColor; opponent: PlayerColor } => {
    // Filter finished matches or matches with determined colors against this opponent
    const vsMatches = matches
      .filter(m => m.opponentName === opponent && m.result !== MatchResult.PENDING)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (vsMatches.length === 0) {
      // Default for first game: User is White (Standard convention)
      return { user: 'white', opponent: 'black' };
    }

    const lastMatch = vsMatches[0];
    if (lastMatch.userColor === 'white') {
      return { user: 'black', opponent: 'white' };
    } else {
      return { user: 'white', opponent: 'black' };
    }
  };

  const activeMatch = useMemo(() => {
    return matches.find(m => m.id === activeMatchId);
  }, [matches, activeMatchId]);

  // --- Handlers ---

  const createPendingMatch = (opponentName: string) => {
    const colors = determineColors(opponentName);
    
    const newMatch: Match = {
      id: Date.now().toString(),
      opponentName: opponentName,
      userColor: colors.user,
      result: MatchResult.PENDING,
      timestamp: Date.now(),
    };

    setMatches([newMatch, ...matches]);
    setCurrentView('list'); // Return to list immediately
    setNewOpponentName('');
  };

  const handleAddOpponent = () => {
    const name = newOpponentName.trim();
    if (name && !opponents.includes(name)) {
      setOpponents([...opponents, name]);
      createPendingMatch(name);
    }
  };

  const handleSelectOpponent = (name: string) => {
    createPendingMatch(name);
  };

  const handleMatchClick = (match: Match) => {
    if (match.result === MatchResult.PENDING) {
      setActiveMatchId(match.id);
      setCurrentView('resolve_match');
    }
  };

  const handleFinishMatch = (result: MatchResult) => {
    if (!activeMatchId) return;

    setMatches(matches.map(m => 
      m.id === activeMatchId 
        ? { ...m, result: result } 
        : m
    ));
    setCurrentView('list');
    setActiveMatchId(null);
  };

  // --- Scoreboard Logic ---
  const ScoreBoard = () => {
    const stats: OpponentStats[] = opponents.map(opp => {
      // Only count finished matches
      const oppMatches = matches.filter(m => m.opponentName === opp && m.result !== MatchResult.PENDING);
      let wins = 0;
      let losses = 0;
      let draws = 0;

      oppMatches.forEach(m => {
        if (m.result === MatchResult.WIN) wins++;
        else if (m.result === MatchResult.LOSS) losses++;
        else draws++;
      });

      return {
        name: opp,
        wins,
        losses,
        draws,
        gamesPlayed: oppMatches.length,
        totalPoints: wins * 1 + draws * 0.5,
        opponentPoints: losses * 1 + draws * 0.5
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const totalMyPoints = matches.reduce((acc, m) => {
        if (m.result === MatchResult.WIN) return acc + 1;
        if (m.result === MatchResult.DRAW) return acc + 0.5;
        return acc;
    }, 0);

    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white p-6 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Totale Punti (Io)</h2>
            <div className="text-4xl font-black text-indigo-600">{totalMyPoints}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
            <h3 className="font-bold text-slate-700 mb-3 text-lg">Dettaglio vs Avversari</h3>
            {stats.map(stat => (
                <div key={stat.name} className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                             <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                                <UserIcon />
                             </div>
                            <span className="font-bold text-lg text-slate-800">{stat.name}</span>
                        </div>
                    </div>

                    {/* Score Comparison */}
                    <div className="flex items-center justify-center gap-8 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex flex-col items-center">
                             <span className="text-xs font-bold text-slate-400 uppercase">Io</span>
                             <span className="text-2xl font-black text-indigo-600">{stat.totalPoints}</span>
                        </div>
                        <div className="text-slate-300 font-light text-xl">vs</div>
                        <div className="flex flex-col items-center">
                             <span className="text-xs font-bold text-slate-400 uppercase">{stat.name}</span>
                             <span className="text-2xl font-black text-slate-600">{stat.opponentPoints}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-emerald-50 rounded-lg py-2 border border-emerald-100">
                            <div className="font-bold text-emerald-700">{stat.wins}</div>
                            <div className="text-xs text-emerald-600">Vinte</div>
                        </div>
                         <div className="bg-amber-50 rounded-lg py-2 border border-amber-100">
                            <div className="font-bold text-amber-700">{stat.draws}</div>
                            <div className="text-xs text-amber-600">Patte</div>
                        </div>
                         <div className="bg-rose-50 rounded-lg py-2 border border-rose-100">
                            <div className="font-bold text-rose-700">{stat.losses}</div>
                            <div className="text-xs text-rose-600">Perse</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md flex items-center justify-between h-16">
        {currentView === 'list' ? (
             <h1 className="text-xl font-bold tracking-tight">Scacchi Tracker</h1>
        ) : (
            <button 
                onClick={() => {
                  setCurrentView('list');
                  setActiveMatchId(null);
                }} 
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
                <ArrowLeftIcon />
                <span className="font-medium">Indietro</span>
            </button>
        )}
        
        {currentView === 'list' && (
             <button 
                onClick={() => setCurrentView('scoreboard')}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-slate-700"
            >
                <TrophyIcon />
                <span>Punteggio</span>
            </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        
        {/* LIST VIEW */}
        {currentView === 'list' && (
          <div className="p-4 pb-24">
            {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 mt-10">
                    <div className="bg-slate-200 p-6 rounded-full mb-4">
                        <CrownIcon />
                    </div>
                    <p className="text-center">Nessuna partita registrata.<br/>Premi + per iniziare.</p>
                </div>
            ) : (
                matches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onClick={handleMatchClick}
                />
                ))
            )}
          </div>
        )}

        {/* ADD MATCH: SELECT OPPONENT */}
        {currentView === 'add_select_opponent' && (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Nuova Partita</h2>
            <p className="text-slate-500 mb-4 text-sm">Seleziona l'avversario. La partita verrà creata come "In Corso" e potrai chiuderla in seguito.</p>
            <div className="space-y-3">
                {opponents.map(opp => (
                    <button 
                        key={opp}
                        onClick={() => handleSelectOpponent(opp)}
                        className="w-full text-left p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all flex items-center justify-between group"
                    >
                        <span className="font-semibold text-lg text-slate-700 group-hover:text-indigo-700">{opp}</span>
                        <div className="text-slate-300 group-hover:text-indigo-500">
                             <UserIcon />
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-500 mb-2">Nuovo Avversario</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newOpponentName}
                        onChange={(e) => setNewOpponentName(e.target.value)}
                        placeholder="Nome..."
                        className="flex-1 p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={handleAddOpponent}
                        disabled={!newOpponentName.trim()}
                        className="bg-indigo-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold shadow-md active:scale-95 transition-transform"
                    >
                        Crea
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* RESOLVE MATCH (Set Result) */}
        {currentView === 'resolve_match' && activeMatch && (
            <div className="p-6 flex flex-col items-center h-full">
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Chiudi Partita</div>
                <h2 className="text-3xl font-black text-slate-900 mb-8">{activeMatch.opponentName}</h2>

                <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
                    <h3 className="text-center text-slate-500 font-medium mb-4">Colori in Gioco</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <span className="text-sm font-bold text-slate-400">Io</span>
                            <div className={`w-16 h-16 rounded-full border-4 shadow-inner flex items-center justify-center ${activeMatch.userColor === 'white' ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-600'}`}>
                                <span className={`text-xs font-bold ${activeMatch.userColor === 'white' ? 'text-slate-900' : 'text-white'}`}>
                                    {activeMatch.userColor === 'white' ? 'BIANCO' : 'NERO'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-300 font-bold text-xl">VS</div>
                        <div className="flex flex-col items-center gap-2 w-1/3">
                             <span className="text-sm font-bold text-slate-400">{activeMatch.opponentName}</span>
                            <div className={`w-16 h-16 rounded-full border-4 shadow-inner flex items-center justify-center ${activeMatch.userColor === 'white' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                                <span className={`text-xs font-bold ${activeMatch.userColor === 'white' ? 'text-white' : 'text-slate-900'}`}>
                                    {activeMatch.userColor === 'white' ? 'NERO' : 'BIANCO'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-3 mt-auto mb-6">
                    <p className="text-center text-slate-800 font-bold mb-4">Com'è finita?</p>
                    
                    <button 
                        onClick={() => handleFinishMatch(MatchResult.WIN)}
                        className="w-full p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md font-bold text-lg flex justify-between items-center transition-transform active:scale-95"
                    >
                        <span>Vittoria (Io)</span>
                        <span className="bg-emerald-700 bg-opacity-30 px-2 py-1 rounded text-sm">+1 pt</span>
                    </button>

                    <button 
                        onClick={() => handleFinishMatch(MatchResult.DRAW)}
                        className="w-full p-4 bg-amber-400 hover:bg-amber-500 text-amber-900 rounded-xl shadow-md font-bold text-lg flex justify-between items-center transition-transform active:scale-95"
                    >
                        <span>Patta</span>
                        <span className="bg-amber-600 bg-opacity-20 px-2 py-1 rounded text-sm">+0.5 pt</span>
                    </button>

                    <button 
                        onClick={() => handleFinishMatch(MatchResult.LOSS)}
                        className="w-full p-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl shadow-sm font-bold text-lg flex justify-between items-center transition-transform active:scale-95"
                    >
                         <span>Vittoria {activeMatch.opponentName}</span>
                        <span className="bg-slate-400 bg-opacity-20 px-2 py-1 rounded text-sm">0 pt</span>
                    </button>
                </div>
            </div>
        )}

        {/* SCOREBOARD */}
        {currentView === 'scoreboard' && <ScoreBoard />}

      </main>

      {/* FAB - Add Match (Only visible in List view) */}
      {currentView === 'list' && (
        <button
          onClick={() => setCurrentView('add_select_opponent')}
          className="absolute bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 z-20"
          aria-label="Aggiungi Partita"
        >
          <PlusIcon />
        </button>
      )}

    </div>
  );
}