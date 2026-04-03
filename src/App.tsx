import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = "https://easter-be-2.onrender.com/api";

interface Clue {
    id?: number;
    name?: string;
    puzzleType: string;
    content: string;
    unlockCode?: string;
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================
const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

const Leaderboard = ({ onGlobalReset }: { onGlobalReset?: () => void }) => {
    const [stats, setStats] = useState<any[]>([]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("Erro ao carregar stats");
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleGlobalReset = async () => {
        if (window.confirm("⚠️ ATENÇÃO: Isto vai apagar o progresso de TODAS as equipas!")) {
            await fetch(`${API_BASE}/reset-all`, { method: 'POST' });
            if (onGlobalReset) onGlobalReset();
        }
    };

    return (
        <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.9)', padding: '15px', borderRadius: '15px', color: '#333' }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>📊 Classificação</h3>
            {stats.map((team, index) => (
                <div key={team.color} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <span>{index === 0 && team.finished ? '🥇 ' : ''}<b>{team.color}</b></span>
                    <span>{formatTime(team.durationMs)}</span>
                </div>
            ))}
            <button onClick={handleGlobalReset} style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                💀 RESET GLOBAL
            </button>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function App() {
    const [teamColor, setTeamColor] = useState<string | null>(localStorage.getItem('teamColor'));
    const [currentClue, setCurrentClue] = useState<Clue | null>(null);
    const [codeEntry, setCodeEntry] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [viewingStats, setViewingStats] = useState<boolean>(false);

    // Navegação de histórico
    const [maxStepReached, setMaxStepReached] = useState<number>(0);
    const [currentDisplayStep, setCurrentDisplayStep] = useState<number>(0);

    useEffect(() => {
        if (teamColor) fetchClue();
    }, [teamColor]);

    const selectTeam = async (color: string) => {
        const res = await fetch(`${API_BASE}/start?color=${color}`, { method: 'POST' });
        const data = await res.json();
        localStorage.setItem('teamColor', color);
        setTeamColor(color);
        setMaxStepReached(data.step || 0);
        setCurrentDisplayStep(data.step || 0);
    };

    const fetchClue = async () => {
        const res = await fetch(`${API_BASE}/clue?color=${teamColor}`);
        const data = await res.json();
        if (data.finished) {
            setIsFinished(true);
        } else {
            setCurrentClue(data);
            // Sincroniza o passo visual com o real do servidor
            // Assumimos que o ID da pista ou ordem dita o passo
            if (data.id !== undefined) {
                setMaxStepReached(data.id);
                setCurrentDisplayStep(data.id);
            }
        }
    };

    const submitCode = async () => {
        if (!codeEntry.trim()) return;
        const res = await fetch(`${API_BASE}/verify?color=${teamColor}&code=${codeEntry}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            setCodeEntry('');
            setErrorMsg('');
            fetchClue();
        } else {
            setErrorMsg(data.message || "Código Incorreto!");
        }
    };

    const resetGame = () => {
        localStorage.removeItem('teamColor');
        setTeamColor(null);
        setIsFinished(false);
        setViewingStats(false);
        setCurrentClue(null);
    };

    // --- Ecrã de Seleção ---
    if (!teamColor) {
        if (viewingStats) return (
            <div className="app-container">
                <div className="content-area center">
                    <h1>Estatísticas</h1>
                    <Leaderboard onGlobalReset={resetGame} />
                    <button className="verify-btn gray" onClick={() => setViewingStats(false)} style={{marginTop: '20px'}}>Voltar</button>
                </div>
            </div>
        );
        return (
            <div className="app-container">
                <div className="content-area center" style={{paddingTop: '50px'}}>
                    <h1>🥚 Caça aos Ovos</h1>
                    <div className="team-grid">
                        <button className="team-btn" onClick={() => selectTeam('RED')} style={{background: '#ff4757'}}>Vermelha</button>
                        <button className="team-btn" onClick={() => selectTeam('BLUE')} style={{background: '#1e90ff'}}>Azul</button>
                        <button className="team-btn" onClick={() => selectTeam('GREEN')} style={{background: '#2ed573'}}>Verde</button>
                    </div>
                    <button onClick={() => setViewingStats(true)} style={{marginTop: '40px', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#666'}}>📊 Ver Classificação</button>
                </div>
            </div>
        );
    }

    // --- Ecrã de Vitória ---
    if (isFinished) return (
        <div className="app-container">
            <div className="content-area center" style={{paddingTop: '50px'}}>
                <h1 style={{fontSize: '4rem'}}>🏆</h1>
                <h1>Parabéns!</h1>
                <p>Encontraram todos os ovos!</p>
                <Leaderboard onGlobalReset={resetGame} />
                <button className="verify-btn" onClick={resetGame} style={{marginTop: '20px', background: '#ff4757'}}>Sair</button>
            </div>
        </div>
    );

    // --- Jogo Ativo ---
    return (
        <div className="app-container">
            <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'}}>
                <button
                    onClick={() => setCurrentDisplayStep(s => s - 1)}
                    disabled={currentDisplayStep === 0}
                    style={{fontSize: '1.5rem', background: 'none', border: 'none', opacity: currentDisplayStep === 0 ? 0.2 : 1}}
                >⬅️</button>

                <div style={{textAlign: 'center'}}>
                    <h4 style={{margin: 0}}>Pista {currentDisplayStep + 1}</h4>
                    <small style={{color: teamColor}}>{teamColor} TEAM</small>
                </div>

                <button
                    onClick={() => setCurrentDisplayStep(s => s + 1)}
                    disabled={currentDisplayStep >= maxStepReached}
                    style={{fontSize: '1.5rem', background: 'none', border: 'none', opacity: currentDisplayStep >= maxStepReached ? 0.2 : 1}}
                >➡️</button>
            </div>

            <div className="content-area">
                {currentDisplayStep < maxStepReached ? (
                    <div className="puzzle-card" style={{textAlign: 'center', opacity: 0.7}}>
                        <p>✅ Já resolveste esta pista!</p>
                        <p style={{fontSize: '0.8rem', color: '#666'}}>Usa a seta da direita para veres o teu desafio atual.</p>
                        <button onClick={() => setCurrentDisplayStep(maxStepReached)} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white'}}>Voltar à Pista Atual</button>
                    </div>
                ) : (
                    currentClue && (
                        <div className="puzzle-card">
                            <h3 style={{textAlign: 'center'}}>{currentClue.puzzleType}</h3>
                            {currentClue.puzzleType === 'SUDOKU' && <MiniSudoku gridData={currentClue.content} />}
                            {currentClue.puzzleType === 'CROSSWORD' && <MiniCrossword gridData={currentClue.content} />}
                            {(currentClue.puzzleType === 'ENIGMA' || currentClue.puzzleType === 'ANAGRAM') && <p style={{textAlign: 'center', fontSize: '1.2rem'}}>{currentClue.content}</p>}
                        </div>
                    )
                )}
                {errorMsg && <div className="error-msg" style={{color: 'red', textAlign: 'center', marginTop: '10px'}}>{errorMsg}</div>}
            </div>

            {currentDisplayStep === maxStepReached && (
                <div className="bottom-bar" style={{position: 'fixed', bottom: 0, width: '100%', padding: '20px', background: 'white', display: 'flex', gap: '10px', boxSizing: 'border-box'}}>
                    <input className="code-input" placeholder="Código do ovo..." value={codeEntry} onChange={(e) => setCodeEntry(e.target.value.toUpperCase())} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}} />
                    <button className="verify-btn" onClick={submitCode} style={{padding: '12px 25px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold'}}>GO</button>
                </div>
            )}
        </div>
    );
}

// ==========================================
// PUZZLES
// ==========================================
const MiniSudoku = ({ gridData }: { gridData: string }) => {
    const parsed = JSON.parse(gridData);
    const [grid, setGrid] = useState<number[][]>(parsed.initial);
    const [solved, setSolved] = useState(false);

    const check = (newGrid: number[][]) => {
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++)
                if (newGrid[r][c] !== parsed.solution[r][c]) return false;
        return true;
    };

    const update = (r: number, c: number, v: string) => {
        const val = parseInt(v) || 0;
        const next = grid.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell)));
        setGrid(next);
        if (check(next)) setSolved(true);
    };

    return (
        <div style={{textAlign: 'center'}}>
            {solved ? <div style={{background: '#4ade80', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px'}}>{parsed.clue}</div> : <p>Resolve para a pista!</p>}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 50px)', gap: '5px', justifyContent: 'center'}}>
                {grid.flatMap((row, r) => row.map((cell, c) => (
                    <input key={`${r}-${c}`} type="text" maxLength={1} value={cell || ''} onChange={e => update(r, c, e.target.value)} disabled={parsed.initial[r][c] !== 0 || solved} style={{width: '50px', height: '50px', textAlign: 'center', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px'}} />
                )))}
            </div>
        </div>
    );
};

const MiniCrossword = ({ gridData }: { gridData: string }) => {
    const grid: string[][] = JSON.parse(gridData);
    return (
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${grid[0].length}, 40px)`, gap: '4px', justifyContent: 'center'}}>
            {grid.flatMap((row, r) => row.map((cell, c) => (
                <div key={`${r}-${c}`} style={{width: '40px', height: '40px', background: cell === '#' ? '#333' : 'white', border: cell === '#' ? 'none' : '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
                    {cell !== '#' && cell !== ' ' ? cell : ''}
                </div>
            )))}
        </div>
    );
};

export default App;