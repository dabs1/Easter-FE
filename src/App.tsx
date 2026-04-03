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
// COMPONENTES AUXILIARES (LEADERBOARD)
// ==========================================
const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

const Leaderboard = () => {
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/stats`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch stats");
            }
        };

        // Fetch imediatamente e depois a cada 3 segundos
        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ marginTop: '30px', textAlign: 'left', background: 'rgba(255,255,255,0.8)', padding: '15px', borderRadius: '15px', color: '#333' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>📊 Live Leaderboard</h3>
            {stats.length === 0 && <p style={{textAlign: 'center'}}>A carregar tempos...</p>}
            {stats.map((team, index) => (
                <div key={team.color} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px',
                    borderBottom: '1px solid #ccc',
                    fontWeight: team.finished ? 800 : 400
                }}>
                    <span>
                        {index === 0 && team.finished ? '🥇 ' : ''}
                        {team.color} {team.finished ? '(Final)' : `(Pista ${team.step})`}
                    </span>
                    <span>{formatTime(team.durationMs)}</span>
                </div>
            ))}
        </div>
    );
};


// ==========================================
// COMPONENTE PRINCIPAL (APP)
// ==========================================
function App() {
    const [teamColor, setTeamColor] = useState<string | null>(localStorage.getItem('teamColor'));
    const [currentClue, setCurrentClue] = useState<Clue | null>(null);
    const [codeEntry, setCodeEntry] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isFinished, setIsFinished] = useState<boolean>(false);

    // NOVO: Estado para controlar se estamos a ver os stats no ecrã inicial
    const [viewingStats, setViewingStats] = useState<boolean>(false);

    useEffect(() => {
        if (teamColor) {
            fetchClue();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamColor]);

    const selectTeam = async (color: string) => {
        await fetch(`${API_BASE}/start?color=${color}`, { method: 'POST' });
        localStorage.setItem('teamColor', color);
        setTeamColor(color);
    };

    const fetchClue = async () => {
        const res = await fetch(`${API_BASE}/clue?color=${teamColor}`);
        const data = await res.json();

        if (data.finished) {
            setIsFinished(true);
        } else {
            setCurrentClue(data);
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
            setCodeEntry('');
        }
    };

    const resetGame = async () => {
        try {
            if (teamColor) {
                await fetch(`${API_BASE}/reset?color=${teamColor}`, { method: 'POST' });
            }
        } catch (error) {
            console.log("Backend offline, mas a resetar o frontend na mesma.");
        } finally {
            localStorage.removeItem('teamColor');
            setTeamColor(null);
            setCurrentClue(null);
            setIsFinished(false);
            setCodeEntry('');
            setErrorMsg('');
            setViewingStats(false); // Garante que volta ao menu principal
        }
    };

    const getTeamColorHex = (color: string) => {
        if (color === 'RED') return '#ff4757';
        if (color === 'BLUE') return '#1e90ff';
        if (color === 'GREEN') return '#2ed573';
        return '#333';
    };

    const getPuzzleIcon = (type: string) => {
        if (type === 'SUDOKU') return '🔢';
        if (type === 'ANAGRAM') return '🔀';
        if (type === 'CROSSWORD') return '📝';
        return '🕵️‍♂️';
    };

    // --- 1. ECRÃ DE SELEÇÃO DE EQUIPA E ESTATÍSTICAS ---
    if (!teamColor) {
        // Se o utilizador clicou para ver os Stats, mostramos este ecrã
        if (viewingStats) {
            return (
                <div className="app-container">
                    <div className="content-area" style={{ textAlign: 'center', paddingTop: '50px' }}>
                        <h1>Estatísticas Ao Vivo</h1>
                        <Leaderboard />
                        <button
                            className="verify-btn"
                            onClick={() => setViewingStats(false)}
                            style={{ marginTop: '30px', backgroundColor: '#94a3b8' }}>
                            Voltar Atrás
                        </button>
                    </div>
                </div>
            );
        }

        // Caso contrário, mostramos o ecrã normal de seleção de equipa
        return (
            <div className="app-container">
                <div className="content-area" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <h1>🥚 Caça aos Ovos</h1>
                    <p>Escolhe a tua equipa para começar!</p>
                    <div className="team-grid">
                        <button className="team-btn" onClick={() => selectTeam('RED')} style={{ background: getTeamColorHex('RED') }}>Equipa Vermelha</button>
                        <button className="team-btn" onClick={() => selectTeam('BLUE')} style={{ background: getTeamColorHex('BLUE') }}>Equipa Azul</button>
                        <button className="team-btn" onClick={() => selectTeam('GREEN')} style={{ background: getTeamColorHex('GREEN') }}>Equipa Verde</button>
                    </div>

                    {/* NOVO: Botão para ir ver a classificação */}
                    <button
                        onClick={() => setViewingStats(true)}
                        style={{
                            marginTop: '40px',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '12px',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                        }}>
                        📊 Ver Classificação Ao Vivo
                    </button>
                </div>
            </div>
        );
    }

    // --- 2. ECRÃ DE VITÓRIA ---
    if (isFinished) {
        return (
            <div className="app-container">
                <div className="content-area" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <h1 style={{ fontSize: '4rem', margin: 0 }}>🏆</h1>
                    <h1>Vitória!</h1>
                    <p>Encontraram todos os ovos dourados. Que venha o chocolate!</p>

                    <Leaderboard />

                    <button
                        className="verify-btn"
                        onClick={resetGame}
                        style={{ marginTop: '30px', backgroundColor: '#ff4757' }}>
                        Recomeçar
                    </button>
                </div>
            </div>
        );
    }

    // --- 3. ECRÃ DO JOGO ATIVO ---
    return (
        <div className="app-container">
            {/* Cabeçalho */}
            <div className="header">
                <h2>Alvo Adquirido</h2>
                <div className="team-badge" style={{ backgroundColor: getTeamColorHex(teamColor) }}>
                    EQUIPA {teamColor}
                </div>
                <div
                    onClick={resetGame}
                    style={{ fontSize: '0.7rem', color: '#888', marginTop: '10px', cursor: 'pointer', textDecoration: 'underline' }}>
                    Reset Equipa (Testes)
                </div>
            </div>

            {/* Área de Conteúdo da Pista */}
            <div className="content-area">
                {currentClue && (
                    <div className="puzzle-card">
                        <div className="puzzle-icon">{getPuzzleIcon(currentClue.puzzleType)}</div>
                        <h3>{currentClue.puzzleType}</h3>

                        {currentClue.puzzleType === 'SUDOKU' && (
                            <MiniSudoku gridData={currentClue.content} />
                        )}

                        {currentClue.puzzleType === 'CROSSWORD' && (
                            <MiniCrossword gridData={currentClue.content} />
                        )}

                        {(currentClue.puzzleType === 'ENIGMA' || currentClue.puzzleType === 'ANAGRAM') && (
                            <p>{currentClue.content}</p>
                        )}
                    </div>
                )}
                {errorMsg && <div className="error-msg">❌ {errorMsg}</div>}
            </div>

            {/* Barra Inferior */}
            <div className="bottom-bar">
                <input
                    type="text"
                    className="code-input"
                    placeholder="Código do ovo..."
                    value={codeEntry}
                    onChange={(e) => setCodeEntry(e.target.value.toUpperCase())}
                    autoComplete="off"
                />
                <button className="verify-btn" onClick={submitCode}>GO</button>
            </div>
        </div>
    );
}

// ==========================================
// COMPONENTES DOS PUZZLES
// ==========================================

const MiniSudoku = ({ gridData }: { gridData: string }) => {
    const parsedData = JSON.parse(gridData);
    const initialGrid: number[][] = parsedData.initial;
    const solutionGrid: number[][] = parsedData.solution;
    const secretClue: string = parsedData.clue;

    const [grid, setGrid] = useState<number[][]>(initialGrid);
    const [isSolved, setIsSolved] = useState<boolean>(false);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const num = parseInt(value) || 0;

        const newGrid = grid.map((row, r) =>
            row.map((cell, c) => (r === rowIndex && c === colIndex ? num : cell))
        );
        setGrid(newGrid);

        let solved = true;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (newGrid[r][c] !== solutionGrid[r][c]) {
                    solved = false;
                }
            }
        }
        setIsSolved(solved);
    };

    return (
        <div>
            {!isSolved ? (
                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                    Resolve o Sudoku (1-4) para desbloquear a pista!
                </p>
            ) : (
                <div style={{ backgroundColor: '#4ade80', padding: '15px', borderRadius: '12px', color: 'white', marginBottom: '15px', boxShadow: '0 4px 10px rgba(74, 222, 128, 0.3)' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>✨ Pista Desbloqueada!</h4>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{secretClue}</span>
                </div>
            )}

            <div className="grid-board" style={{ gridTemplateColumns: 'repeat(4, 50px)' }}>
                {grid.flatMap((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <input
                            key={`${rowIndex}-${colIndex}`}
                            className="grid-cell"
                            type="text"
                            maxLength={1}
                            value={cell !== 0 ? cell : ''}
                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            disabled={initialGrid[rowIndex][colIndex] !== 0 || isSolved}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const MiniCrossword = ({ gridData }: { gridData: string }) => {
    const initialGrid: string[][] = JSON.parse(gridData);

    return (
        <div>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>1 Vertical: Animal que muge.<br/>1 Horizontal: Caça ratos.</p>
            <div className="grid-board" style={{ gridTemplateColumns: `repeat(${initialGrid[0].length}, 50px)` }}>
                {initialGrid.flatMap((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        const isBlack = cell === '#';
                        return (
                            <input
                                key={`${rowIndex}-${colIndex}`}
                                className={`grid-cell ${isBlack ? 'black-square' : ''}`}
                                type="text"
                                maxLength={1}
                                defaultValue={cell !== ' ' && !isBlack ? cell : ''}
                                disabled={isBlack}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default App;