import { useState } from 'react';
import GameBoard from './components/GameBoard';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import { AnimatePresence, motion } from 'framer-motion';
import type { AIDifficulty } from './logic/ai';
import { useMultiplayer } from './hooks/useMultiplayer';

function App() {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [winner, setWinner] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [gameId, setGameId] = useState(0); // For resetting local game

  const mp = useMultiplayer();

  const handleStartLocal = (count: number, diff: AIDifficulty) => {
    setPlayerCount(count);
    setDifficulty(diff);
    setGameMode('local');
    setView('game');
    setWinner(null);
  };

  const handleGoOnline = () => {
    setGameMode('online');
    setView('lobby');
  };

  const handleEndGame = (winnerId: string) => {
    setWinner(winnerId);
  };

  const handleBackToMenu = () => {
    mp.disconnect();
    setView('menu');
    setWinner(null);
  };

  const handleRestart = () => {
    if (gameMode === 'local') {
      setGameId(prev => prev + 1);
      setWinner(null);
    } else {
      mp.restartGame();
      setWinner(null);
    }
  };

  // When online game starts (gameState arrives from server)
  const onlineGameStarted = mp.gameState !== null && view === 'lobby';
  if (onlineGameStarted) {
    setView('game');
  }

  return (
    <div className="h-screen w-full bg-[#111] overflow-hidden text-white font-sans selection:bg-purple-500 selection:text-white">
      <AnimatePresence mode='wait'>
        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full"
          >
            <MainMenu onStartGame={handleStartLocal} onGoOnline={handleGoOnline} />
          </motion.div>
        )}

        {view === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Lobby
              connected={mp.connected}
              roomCode={mp.roomCode}
              playerId={mp.playerId}
              players={mp.players}
              aiCount={mp.aiCount}
              difficulty={mp.difficulty}
              isHost={mp.isHost}
              error={mp.error}
              onConnect={mp.connect}
              onCreateRoom={mp.createRoom}
              onJoinRoom={mp.joinRoom}
              onSetAICount={mp.setAICount}
              onSetDifficulty={mp.setDifficulty}
              onStartGame={mp.startGame}
              onBack={handleBackToMenu}
            />
          </motion.div>
        )}

        {view === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full"
          >
            <GameBoard
              key={gameId}
              onEndGame={handleEndGame}
              onBackToMenu={handleBackToMenu}
              playerCount={playerCount}
              difficulty={difficulty}
              mode={gameMode}
              onlineState={mp.gameState}
              onlinePlayerId={mp.playerId}
              onPlayCard={mp.playCard}
              onPassTurn={mp.passTurn}
            />
            {winner && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#222] p-8 rounded-2xl border border-gray-700 text-center max-w-sm w-full mx-4 shadow-2xl"
                >
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                    {winner === (gameMode === 'online' ? mp.playerId : 'human') ? "¡VICTORIA!" : "DERROTA"}
                  </h2>
                  <p className="text-gray-400 mb-8">
                    {winner === (gameMode === 'online' ? mp.playerId : 'human') ? "¡Dominaste el Combo!" : "Te superaron esta vez."}
                  </p>
                  <button
                    onClick={handleBackToMenu}
                    className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Volver al Menú
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-full py-3 mt-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg"
                  >
                    🏆 Jugar Revancha
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
