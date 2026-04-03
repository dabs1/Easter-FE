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
        } catch (err) { console.error("Stats error"); }
    };
    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleGlobalReset = async () => {
        if (window.confirm("⚠️ RESET TOTAL?")) {
            await fetch(`${API_BASE}/reset-all`, { method: 'POST' });
            if (onGlobalReset) onGlobalReset();
        }
    };

    return (
        <div className="leaderboard-card">
            <h3>📊 Classificação</h3>
            {stats.map((team, index) => (
                <div key={team.color} className="stat-row">
                    <span>{index === 0 && team.finished ? '🥇 ' : ''}{team.color}</span>
                    <span>{formatTime(team.durationMs)}</span>
                </div>
            ))}
            <button className="admin-btn" onClick={handleGlobalReset}>💀 RESET GLOBAL</button>
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function App() {
    const [teamColor, setTeamColor] = useState<string | null>(localStorage.getItem('teamColor'));
    const [maxStep, setMaxStep] = useState<number>(0); // O passo mais longe que chegaram
    const [viewingStep, setViewingStep] = useState<number>(0); // O passo que estão a ver agora
    const [currentClue, setCurrentClue] = useState<Clue | null>(null);
    const [codeEntry, setCodeEntry] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [viewingStats, setViewingStats] = useState<boolean>(false);

    useEffect(() => {
        if (teamColor) {
            fetchClue(viewingStep);
        }
    }, [teamColor, viewingStep]);

    const selectTeam = async (color: string) => {
        const res = await fetch(`${API_BASE}/start?color=${color}`, { method: 'POST' });
        const data = await res.json();
        localStorage.setItem('teamColor', color);
        setTeamColor(color);
        setMaxStep(data.step);
        setViewingStep(data.step);
    };

    const fetchClue = async (stepToFetch: number) => {
        // Usamos o endpoint de clue mas passando o step se quisermos ver histórico
        // Como o seu backend atual usa o progresso do servidor, precisamos de uma pequena lógica:
        const res = await fetch(`${API_BASE}/clue?color=${teamColor}`);
        const data = await res.json();

        if (data.finished) {
            setIsFinished(true);
        } else {
            // NOTA: Para ver histórico real, o backend precisaria aceitar um parâmetro ?step=X
            // Por agora, vamos simular: se viewingStep < maxStep, mostramos "Já resolveste isto"
            setCurrentClue(data);
        }
    };

    const submitCode = async () => {
        const res = await fetch(`${API_BASE}/verify?color=${teamColor}&code=${codeEntry}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            const next = data.nextStep;
            setMaxStep(next);
            setViewingStep(next); // Salta automaticamente para a nova pista
            setCodeEntry('');
            setErrorMsg('');
        } else {
            setErrorMsg("Código Incorreto!");
        }
    };

    const resetGame = () => {
        localStorage.removeItem('teamColor');
        setTeamColor(null);
        setIsFinished(false);
        setViewingStats(false);
        setViewingStep(0);
        setMaxStep(0);
    };

    // Navegação entre pistas
    const navBack = () => { if (viewingStep > 0) setViewingStep(v => v - 1); };
    const navForward = () => { if (viewingStep < maxStep) setViewingStep(v => v + 1); };

    if (!teamColor) {
        if (viewingStats) return (
            <div className="app-container">
                <div className="content-area center">
                    <h1>Estatísticas</h1>
                    <Leaderboard onGlobalReset={resetGame} />
                    <button className="verify-btn gray" onClick={() => setViewingStats(false)}>Voltar</button>
                </div>
            </div>
        );
        return (
            <div className="app-container">
                <div className="content-area center">
                    <h1>🥚 Caça aos Ovos</h1>
                    <div className="team-grid">
                        <button className="team-btn red" onClick={() => selectTeam('RED')}>Vermelha</button>
                        <button className="team-btn blue" onClick={() => selectTeam('BLUE')}>Azul</button>
                        <button className="team-btn green" onClick={() => selectTeam('GREEN')}>Verde</button>
                    </div>
                    <button className="link-btn" onClick={() => setViewingStats(true)}>📊 Leaderboard</button>
                </div>
            </div>
        );
    }

    if (isFinished) return (
        <div className="app-container">
            <div className="content-area center">
                <h1>🏆 Vitória!</h1>
                <Leaderboard onGlobalReset={resetGame} />
                <button className="verify-btn red" onClick={resetGame}>Sair</button>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <div className="header">
                {/* SETA PARA TRÁS */}
                <button className="nav-arrow" onClick={navBack} disabled={viewingStep === 0}>←</button>

                <div className="header-info">
                    <h2>Pista {viewingStep + 1}</h2>
                    <span className="badge" style={{background: teamColor}}>{teamColor}</span>
                </div>

                {/* SETA PARA A FRENTE */}
                <button className="nav-arrow" onClick={navForward} disabled={viewingStep === maxStep}>→</button>
            </div>

            <div className="content-area">
                {/* Se estamos a ver uma pista antiga, avisamos o utilizador */}
                {viewingStep < maxStep && (
                    <div className="history-alert">🕰️ Estás a ver uma pista antiga</div>
                )}

                {currentClue && (
                    <div className="puzzle-card">
                        <h3>{currentClue.puzzleType}</h3>
                        {currentClue.puzzleType === 'SUDOKU' ? <MiniSudoku gridData={currentClue.content} /> : <p>{currentClue.content}</p>}
                    </div>
                )}
                {errorMsg && <div className="error-msg">{errorMsg}</div>}
            </div>

            {/* Só mostramos a barra de input se estiverem na pista ATUAL (a mais recente) */}
            {viewingStep === maxStep ? (
                <div className="bottom-bar">
                    <input className="code-input" placeholder="Código..." value={codeEntry} onChange={(e) => setCodeEntry(e.target.value.toUpperCase())} />
                    <button className="verify-btn" onClick={submitCode}>GO</button>
                </div>
            ) : (
                <div className="bottom-bar locked">
                    <p>Pista já resolvida ✅</p>
                    <button className="verify-btn" onClick={() => setViewingStep(maxStep)}>Ir para Atual</button>
                </div>
            )}
        </div>
    );
}

// Reutilize os componentes MiniSudoku e MiniCrossword anteriores aqui...

export default App;