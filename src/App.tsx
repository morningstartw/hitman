/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Crosshair,
  ShieldAlert,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  Pause,
  Award,
  Skull,
  HelpCircle,
  FileText,
  ChevronRight,
  Disc,
  Map as MapIcon,
  Maximize2,
} from 'lucide-react';
import { GameEngine } from './game/engine';
import { LEVELS } from './game/levels';
import { GameState, LevelConfig, MissionStats, DifficultyLevel, DIFFICULTY_CONFIGS } from './game/types';
import { sound } from './game/audio';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('professional');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.65);
  const [showVolumePopup, setShowVolumePopup] = useState<boolean>(false);
  const [isMissionTrackerVisible, setIsMissionTrackerVisible] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // HUD Real-time Stats
  const [hudStats, setHudStats] = useState({
    ammo: 7,
    reserveAmmo: 21,
    coins: 3,
    health: 100,
    alertLevel: 'safe' as import('./game/types').AlertLevel,
    targetEliminated: false,
    canExfiltrate: false,
    instinctEnergy: 100,
    actionPrompt: null as string | null,
    activeCameraAlarmCount: 0,
    targetsRemaining: 1,
    totalTargets: 1,
    targets: [] as { id: string; name: string; isDead: boolean }[],
    minimapMode: 'corner' as 'corner' | 'expanded' | 'hidden',
    difficulty: 'professional' as DifficultyLevel,
  });

  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [victoryStats, setVictoryStats] = useState<MissionStats | null>(null);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStatsUpdate: (stats) => {
        setHudStats(stats);
      },
      onGameOver: (reason) => {
        setGameOverReason(reason);
        setGameState('gameover');
      },
      onVictory: (stats) => {
        setVictoryStats(stats);
        setGameState('victory');
      },
    });

    engineRef.current = engine;
    engine.loadLevel(LEVELS[0]);
    engine.startTitlePreview();

    return () => {
      engine.destroy();
    };
  }, []);

  // Keyboard shortcut listener for global shell navigation (Space/Enter to start, Esc to pause)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          startMission(currentLevelIndex);
        }
      } else if (gameState === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          pauseGame();
        } else if (e.key === 'h' || e.key === 'H') {
          setIsMissionTrackerVisible((prev) => !prev);
        }
      } else if (gameState === 'paused') {
        if (e.key === 'Escape' || e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          resumeGame();
        }
      } else if (gameState === 'gameover') {
        if (e.code === 'Space' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          startMission(currentLevelIndex);
        }
      } else if (gameState === 'victory') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          const nextIdx = (currentLevelIndex + 1) % LEVELS.length;
          startMission(nextIdx);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState, currentLevelIndex]);

  const selectLevelOnTitle = (idx: number) => {
    setCurrentLevelIndex(idx);
    if (engineRef.current) {
      engineRef.current.loadLevel(LEVELS[idx], difficulty);
      engineRef.current.startTitlePreview();
    }
  };

  const selectDifficultyOnTitle = (newDiff: DifficultyLevel) => {
    setDifficulty(newDiff);
    sound.playSuspicionPing();
    if (engineRef.current) {
      engineRef.current.setDifficulty(newDiff);
      engineRef.current.startTitlePreview();
    }
  };

  const startMission = (levelIdx: number, diff: DifficultyLevel = difficulty) => {
    setCurrentLevelIndex(levelIdx);
    setGameOverReason('');
    setVictoryStats(null);
    sound.init();

    if (engineRef.current) {
      engineRef.current.loadLevel(LEVELS[levelIdx], diff);
      engineRef.current.start();
    }
    setGameState('playing');
  };

  const pauseGame = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
    setGameState('paused');
  };

  const resumeGame = () => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setGameState('playing');
  };

  const quitToTitle = () => {
    if (engineRef.current) {
      engineRef.current.loadLevel(LEVELS[currentLevelIndex], difficulty);
      engineRef.current.startTitlePreview();
    }
    sound.stopAlarm();
    setGameState('title');
  };

  const handleVolumeChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    setVolume(clamped);
    sound.setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted && volume === 0) {
      setVolume(0.5);
      sound.setVolume(0.5);
    }
  };

  const cycleMinimap = () => {
    if (engineRef.current) {
      const newMode = engineRef.current.toggleMinimap();
      setHudStats((prev) => ({ ...prev, minimapMode: newMode }));
      sound.playSuspicionPing();
    }
  };

  const setMinimap = (mode: 'corner' | 'expanded' | 'hidden') => {
    if (engineRef.current) {
      engineRef.current.setMinimapMode(mode);
      setHudStats((prev) => ({ ...prev, minimapMode: mode }));
      sound.playSuspicionPing();
    }
  };

  const activeLevel: LevelConfig = LEVELS[currentLevelIndex] || LEVELS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Canvas Layer (Completely Isolated for 60fps performance) */}
      <div className="absolute inset-0 w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full block canvas-crosshair" />
      </div>

      {/* 2. Top-right Global Quick-Bar (Sound Volume, Map Controls & Manual) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {/* Map Control Button Group */}
        <div className="flex items-center rounded-lg bg-slate-900/85 border border-slate-700/60 shadow-lg backdrop-blur-sm p-0.5">
          <button
            onClick={cycleMinimap}
            aria-label="Cycle Tactical Minimap Mode"
            title="切換戰術地圖模式 [M] (標準 / 超大 / 隱藏)"
            className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
              hudStats.minimapMode === 'expanded'
                ? 'bg-sky-950/90 text-sky-200 border border-sky-400/80 shadow'
                : hudStats.minimapMode === 'hidden'
                ? 'bg-rose-950/50 text-rose-300 border border-rose-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <MapIcon className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider">
              {hudStats.minimapMode === 'expanded'
                ? '超大地圖 [M]'
                : hudStats.minimapMode === 'hidden'
                ? '地圖已隱藏 [M]'
                : '雷達 [標準]'}
            </span>
          </button>

          {/* Direct Hide / Show map button */}
          <button
            onClick={() => {
              if (hudStats.minimapMode === 'hidden') {
                setMinimap('corner');
              } else {
                setMinimap('hidden');
              }
            }}
            title={hudStats.minimapMode === 'hidden' ? '顯示地圖 (Show Map) [M]' : '隱藏地圖 (Hide Map) [M]'}
            className={`p-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
              hudStats.minimapMode === 'hidden'
                ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            {hudStats.minimapMode === 'hidden' ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Volume Slider Popover Controller (聲音大小調整) */}
        <div className="relative">
          <button
            onClick={() => setShowVolumePopup((prev) => !prev)}
            aria-label="Adjust Volume"
            title="調整聲音大小 / Volume Control"
            className={`p-2.5 rounded-lg border transition-all shadow-lg backdrop-blur-sm cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
              showVolumePopup
                ? 'bg-slate-800 border-slate-500 text-white ring-2 ring-emerald-500/40'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500'
            }`}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline text-[10px] font-bold tabular-nums">
              {isMuted ? 'MUTE' : `${Math.round(volume * 100)}%`}
            </span>
          </button>

          {/* Volume Slider Dropdown Menu */}
          {showVolumePopup && (
            <div className="absolute right-0 mt-2 w-64 p-3.5 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-50 animate-fade-in font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300 text-[11px] mb-2 font-bold">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>聲音大小 / VOLUME</span>
                </span>
                <span className="text-emerald-400 tabular-nums">
                  {isMuted ? '0% (靜音)' : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              {/* Range Slider */}
              <div className="py-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-800 text-[10px] text-center">
                <button
                  onClick={toggleSound}
                  className={`py-1 rounded border transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  靜音
                </button>
                <button
                  onClick={() => handleVolumeChange(0.3)}
                  className={`py-1 rounded border transition-colors cursor-pointer ${
                    !isMuted && Math.round(volume * 100) === 30
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  30%
                </button>
                <button
                  onClick={() => handleVolumeChange(0.65)}
                  className={`py-1 rounded border transition-colors cursor-pointer ${
                    !isMuted && Math.round(volume * 100) === 65
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  65%
                </button>
                <button
                  onClick={() => handleVolumeChange(1.0)}
                  className={`py-1 rounded border transition-colors cursor-pointer ${
                    !isMuted && Math.round(volume * 100) === 100
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  100%
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Agent Manual Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          aria-label="Agent Manual"
          title="特工手冊 / Manual"
          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-colors shadow-lg backdrop-blur-sm cursor-pointer"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* 3. In-Game Minimalist HUD (< 15% Screen Occlusion, pointer-events-none) */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between z-20">
          {/* Top Row: Mission Brief & Alert Status */}
          <div className="flex items-start justify-between w-full">
            {/* Mission Objective Tracker / Hide Button */}
            {isMissionTrackerVisible ? (
              <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-lg shadow-xl backdrop-blur-sm max-w-sm pointer-events-auto transition-all">
                <div className="text-[10px] tracking-widest text-slate-400 uppercase font-mono font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>ACTIVE CONTRACT // 47</span>
                    {hudStats.totalTargets > 1 && (
                      <span className="text-amber-400 font-bold">
                        {hudStats.totalTargets - hudStats.targetsRemaining}/{hudStats.totalTargets} KIA
                      </span>
                    )}
                  </div>
                  {/* Hide Mission Tracker Button */}
                  <button
                    onClick={() => setIsMissionTrackerVisible(false)}
                    title="隱藏任務清單 [H] / Hide Objective Tracker"
                    className="p-1 -mr-1 rounded hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono">隱藏 [H]</span>
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-100 mt-0.5 tracking-tight flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                    <span className="truncate">{activeLevel.title}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex-shrink-0 ${
                      difficulty === 'casual'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : difficulty === 'master'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        : 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {DIFFICULTY_CONFIGS[difficulty].name}
                  </span>
                </div>

                {/* Dynamic Targets Checkboxes */}
                <div className="mt-2.5 space-y-1.5 font-mono text-xs">
                  {hudStats.targets && hudStats.targets.length > 0 ? (
                    hudStats.targets.map((tgt) => (
                      <div
                        key={tgt.id}
                        className={`flex items-center gap-2 ${
                          tgt.isDead ? 'text-emerald-400 line-through opacity-70' : 'text-rose-400 font-semibold'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                            tgt.isDead
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                              : 'border-rose-500/60'
                          }`}
                        >
                          {tgt.isDead ? '✓' : ''}
                        </span>
                        Eliminate {tgt.name}
                      </div>
                    ))
                  ) : (
                    <div
                      className={`flex items-center gap-2 ${
                        hudStats.targetEliminated ? 'text-emerald-400 line-through opacity-70' : 'text-rose-400 font-semibold'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                          hudStats.targetEliminated ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-rose-500/60'
                        }`}
                      >
                        {hudStats.targetEliminated ? '✓' : ''}
                      </span>
                      Eliminate {activeLevel.targetName}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-2 ${
                      hudStats.targetEliminated
                        ? hudStats.canExfiltrate
                          ? 'text-emerald-400 font-bold animate-pulse'
                          : 'text-amber-400 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                        hudStats.canExfiltrate ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700'
                      }`}
                    >
                      {hudStats.canExfiltrate ? '✓' : ''}
                    </span>
                    Exfiltrate via Extraction Point
                  </div>
                </div>
              </div>
            ) : (
              /* Unhide Mission Objective Floating Button */
              <button
                onClick={() => setIsMissionTrackerVisible(true)}
                title="顯示任務清單 [H] / Show Objective Tracker"
                className="pointer-events-auto bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 px-3 py-2 rounded-lg shadow-xl backdrop-blur-sm text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer group"
              >
                <Eye className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold tracking-tight">任務目標 [H]</span>
                <span className="text-[10px] text-amber-400 font-bold">
                  {hudStats.totalTargets - hudStats.targetsRemaining}/{hudStats.totalTargets} KIA
                </span>
              </button>
            )}

            {/* Center Alert Level Indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`px-6 py-2 rounded-full font-mono text-xs font-bold tracking-widest uppercase border shadow-2xl flex items-center gap-2.5 backdrop-blur-sm transition-all duration-300 ${
                  hudStats.alertLevel === 'alarm'
                    ? 'bg-rose-950/95 border-rose-500 text-rose-200 animate-pulse ring-4 ring-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.6)]'
                    : hudStats.alertLevel === 'combat'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse ring-2 ring-rose-500/40'
                    : hudStats.alertLevel === 'suspicious'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-slate-900/80 border-slate-700/60 text-emerald-400'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {hudStats.alertLevel === 'alarm'
                    ? 'ALARM: SECURITY CAMERA COMPROMISED!'
                    : hudStats.alertLevel === 'combat'
                    ? 'ALERT: COMBAT ENGAGED'
                    : hudStats.alertLevel === 'suspicious'
                    ? 'WARNING: SUSPICIOUS ACTIVITY'
                    : 'STATUS: UNDETECTED'}
                </span>
              </div>
            </div>

            {/* Top Right: Agent Instinct & Health Meter */}
            <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-lg shadow-xl backdrop-blur-sm w-44">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                <span>HEALTH</span>
                <span className="tabular-nums font-bold text-slate-200">{hudStats.health}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${hudStats.health < 35 ? 'bg-rose-500 animate-pulse' : hudStats.health < 65 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${hudStats.health}%` }}
                />
              </div>

              {/* Instinct Gauge */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2.5 mb-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-sky-400" /> INSTINCT [Q]
                </span>
                <span className="tabular-nums font-bold text-sky-300">{hudStats.instinctEnergy}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-150"
                  style={{ width: `${hudStats.instinctEnergy}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Context Action & Weapon Loadout */}
          <div className="flex items-end justify-between w-full">
            {/* Hitman Weapon & Equipment Cluster */}
            <div className="flex items-center gap-3">
              {/* Silverballer Pistol HUD */}
              <div className="bg-slate-950/85 border border-slate-800 px-5 py-3 rounded-lg shadow-2xl backdrop-blur-sm flex items-center gap-4">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <Crosshair className="w-6 h-6 text-slate-200" />
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    SILENCED SILVERBALLER .45
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-tight text-white flex items-baseline gap-1.5 tabular-nums">
                    <span>{hudStats.ammo}</span>
                    <span className="text-sm font-normal text-slate-500">/ {hudStats.reserveAmmo}</span>
                  </div>
                </div>
              </div>

              {/* Distraction Coins */}
              <div className="bg-slate-950/85 border border-slate-800 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-sm flex items-center gap-3">
                <Disc className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-[10px] font-mono tracking-wider text-slate-400">COIN DISTRACTION [F]</div>
                  <div className="text-base font-mono font-bold text-amber-300 tabular-nums">
                    {hudStats.coins} <span className="text-xs text-slate-500 font-normal">REMAINING</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Action Prompt (Centered above bottom edge) */}
            {hudStats.actionPrompt && (
              <div className="bg-slate-900/95 border-2 border-sky-400/80 px-6 py-2.5 rounded-full shadow-2xl text-sky-200 font-mono text-sm font-bold tracking-wider animate-bounce flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                {hudStats.actionPrompt}
              </div>
            )}

            {/* Movement Stance Hint */}
            <div className="bg-slate-950/80 border border-slate-800/80 px-3.5 py-2.5 rounded-lg text-xs font-mono text-slate-400 flex items-center gap-3">
              <span>[SHIFT] 潛行</span>
              <span className="text-slate-600">|</span>
              <span>[R] 裝彈</span>
              <span className="text-slate-600">|</span>
              <span className="text-sky-300">[M] 地圖 (標準/超大/隱藏)</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-300">[H] 隱藏任務</span>
              <span className="text-slate-600">|</span>
              <span>[ESC] 暫停</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TITLE SCREEN MODAL (Full Viewport Game Shell with live world backdrop) */}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between items-center p-6 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent">
          {/* Top branding bar */}
          <div className="w-full flex justify-between items-center max-w-5xl">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ICA SECURE TERMINAL // CONTRACT PROTOCOL v4.7
            </div>
            <div className="text-xs font-mono text-slate-400">AGENCY CLEARED · OPERATIVE 47</div>
          </div>

          {/* Hero Centerpiece & Bespoke Title Lockup */}
          <div className="flex flex-col items-center text-center max-w-3xl my-auto w-full">
            {/* Inline SVG Monogram / Crosshair Logo */}
            <div className="mb-3 relative">
              <svg className="w-16 h-16 text-rose-600 drop-shadow-[0_0_20px_rgba(225,29,72,0.6)]" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
                <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1.5" />
                <path d="M50 12 V30 M50 70 V88 M12 50 H30 M70 50 H88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="50" cy="50" r="4" fill="currentColor" />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-md">
              SILENT <span className="text-rose-500">CONTRACT</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 font-mono tracking-wide max-w-md">
              Tactical 2D Top-Down Stealth Hitman Operations · 7 Global Contracts
            </p>

            {/* Level Selector Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full mt-6 max-h-56 overflow-y-auto pr-1">
              {LEVELS.map((lvl, idx) => (
                <button
                  key={lvl.id}
                  onClick={() => selectLevelOnTitle(idx)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    currentLevelIndex === idx
                      ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/50 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
                    CONTRACT 0{idx + 1}
                  </div>
                  <div className="text-xs font-bold text-slate-100 mt-0.5 line-clamp-1">
                    {lvl.targetsSummary || lvl.targetName}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{lvl.subtitle}</div>
                </button>
              ))}
            </div>

            {/* ICA Security Threat Level (Difficulty Selector) */}
            <div className="w-full mt-4">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>ICA THREAT LEVEL:</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  CALIBRATES GUARD VISION, DETECTION SPEED & HP POOL
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {(['casual', 'professional', 'master'] as DifficultyLevel[]).map((lvl) => {
                  const cfg = DIFFICULTY_CONFIGS[lvl];
                  const isSelected = difficulty === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => selectDifficultyOnTitle(lvl)}
                      className={`p-2.5 md:p-3 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? lvl === 'casual'
                            ? 'bg-emerald-950/45 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg text-white'
                            : lvl === 'master'
                            ? 'bg-rose-950/55 border-rose-500 ring-2 ring-rose-500/50 shadow-lg text-white'
                            : 'bg-sky-950/45 border-sky-500 ring-2 ring-sky-500/40 shadow-lg text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              lvl === 'casual'
                                ? 'bg-emerald-400'
                                : lvl === 'master'
                                ? 'bg-rose-500'
                                : 'bg-sky-400'
                            } ${isSelected ? 'animate-pulse' : 'opacity-60'}`}
                          />
                          <span
                            className={`text-xs font-black tracking-wider uppercase ${
                              isSelected
                                ? lvl === 'casual'
                                ? 'text-emerald-300'
                                : lvl === 'master'
                                ? 'text-rose-400'
                                : 'text-sky-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {cfg.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                            isSelected
                              ? lvl === 'casual'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : lvl === 'master'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cfg.badge}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-mono">
                        {cfg.subtitle}
                      </div>

                      {/* Stat Breakdown Chips */}
                      <div className="mt-2 pt-1.5 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                        <div className="bg-slate-950/60 rounded px-1 py-0.5 border border-slate-800/60">
                          <span className="text-slate-500 block text-[8px] uppercase">DETECT</span>
                          <span className={isSelected ? 'text-slate-200 font-bold' : 'text-slate-400'}>
                            {cfg.detectionMultiplier}x
                          </span>
                        </div>
                        <div className="bg-slate-950/60 rounded px-1 py-0.5 border border-slate-800/60">
                          <span className="text-slate-500 block text-[8px] uppercase">VISION</span>
                          <span className={isSelected ? 'text-slate-200 font-bold' : 'text-slate-400'}>
                            {Math.round(cfg.visionMultiplier * 100)}%
                          </span>
                        </div>
                        <div className="bg-slate-950/60 rounded px-1 py-0.5 border border-slate-800/60">
                          <span className="text-slate-500 block text-[8px] uppercase">GUARD HP</span>
                          <span className={isSelected ? 'text-slate-200 font-bold' : 'text-slate-400'}>
                            {Math.round(100 * cfg.guardHealthMultiplier)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Start CTA Button */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={() => startMission(currentLevelIndex)}
                className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm md:text-base tracking-wider uppercase shadow-2xl hover:shadow-rose-600/30 transition-all flex items-center gap-3 group cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>EXECUTE CONTRACT</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="text-[11px] font-mono text-slate-400">
                Press <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Space</kbd> or <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Enter</kbd> to Begin
              </div>
            </div>
          </div>

          {/* Flat Control-hint Line (Core Game Craft constitution requirement) */}
          <div className="w-full text-center py-2 border-t border-slate-900 text-xs font-mono text-slate-400">
            WASD 移動 · Shift 潛行 · 滑鼠 瞄準/射擊 · 空白鍵 擊倒/拖行 · F 擲硬幣 · Q 直覺 · M 地圖(標準/超大/隱藏) · H 隱藏任務 · Esc 暫停
          </div>
        </div>
      )}

      {/* 5. PAUSE MENU MODAL */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85">
          <div className="bg-slate-900 border border-slate-800 p-7 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-300">
              <Pause className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">OPERATION PAUSED</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs font-mono text-slate-400">{activeLevel.title}</span>
              <span className="text-slate-600">·</span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  difficulty === 'casual'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : difficulty === 'master'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : 'bg-sky-950 text-sky-300 border border-sky-500/40'
                }`}
              >
                {DIFFICULTY_CONFIGS[difficulty].name}
              </span>
            </div>

            {/* Audio Volume Slider in Pause Menu (聲音大小調整) */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>聲音大小 (VOLUME)</span>
                </span>
                <span className="text-emerald-400 tabular-nums">
                  {isMuted ? '0% (靜音)' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : Math.round(volume * 100)}
                onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Tactical Map & Mission Visibility Controls in Pause Menu */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-left font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">戰術地圖 (MAP)</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMinimap('corner')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      hudStats.minimapMode === 'corner' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    標準
                  </button>
                  <button
                    onClick={() => setMinimap('expanded')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      hudStats.minimapMode === 'expanded' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    超大
                  </button>
                  <button
                    onClick={() => setMinimap('hidden')}
                    className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      hudStats.minimapMode === 'hidden' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    隱藏
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">任務目標 (HUD)</div>
                <button
                  onClick={() => setIsMissionTrackerVisible((prev) => !prev)}
                  className={`w-full py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isMissionTrackerVisible ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isMissionTrackerVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{isMissionTrackerVisible ? '顯示中' : '已隱藏 [H]'}</span>
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={resumeGame}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wider uppercase transition-colors cursor-pointer"
              >
                RESUME CONTRACT
              </button>
              <button
                onClick={() => startMission(currentLevelIndex)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> RESTART OPERATION
              </button>
              <button
                onClick={quitToTitle}
                className="w-full py-3 rounded-xl bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-sm transition-colors cursor-pointer"
              >
                ABORT TO BRIEFING ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GAME OVER SCREEN MODAL */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/90 animate-fade-in">
          <div className="bg-slate-900 border border-rose-900/60 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center mx-auto mb-4 text-rose-500">
              <Skull className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-rose-500 tracking-tight">CONTRACT FAILED</h2>
            <p className="text-xs font-mono text-slate-400 mt-1">OPERATIVE COMPROMISED</p>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 mt-5 text-sm text-slate-300 text-left font-mono">
              <span className="text-rose-400 font-bold">FAILURE REASON:</span>
              <p className="mt-1 text-slate-300 text-xs leading-relaxed">{gameOverReason || 'Target escaped or security forces overwhelmed operative.'}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => startMission(currentLevelIndex)}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> RETRY CONTRACT
              </button>
              <button
                onClick={quitToTitle}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                RETURN TO ICA HEADQUARTERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VICTORY / MISSION SUMMARY MODAL */}
      {gameState === 'victory' && victoryStats && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/90 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-900/60 p-8 rounded-2xl max-w-lg w-full shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <Award className="w-8 h-8" />
            </div>

            <div className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase">
              MISSION ACCOMPLISHED // VIP ELIMINATED
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mt-1">CONTRACT EXECUTED</h2>

            {/* Hitman Rating & Threat Level Badge */}
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <div className="px-5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 font-mono text-sm font-extrabold tracking-widest uppercase">
                RANK: {victoryStats.rank}
              </div>
              <div
                className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${
                  (victoryStats.difficulty || difficulty) === 'casual'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : (victoryStats.difficulty || difficulty) === 'master'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                    : 'bg-sky-950 text-sky-300 border border-sky-500/50'
                }`}
              >
                THREAT: {DIFFICULTY_CONFIGS[victoryStats.difficulty || difficulty].name} (
                {DIFFICULTY_CONFIGS[victoryStats.difficulty || difficulty].scoreMultiplier}x SCORE)
              </div>
            </div>

            {/* Performance Debrief Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-6 text-left font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">TIME ELAPSED</div>
                <div className="text-lg font-bold text-white tabular-nums">{victoryStats.timeElapsed}s</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">STEALTH SCORE</div>
                <div className="text-lg font-bold text-emerald-400 tabular-nums">{victoryStats.stealthScore.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">ALARMS TRIGGERED</div>
                <div className={`text-lg font-bold tabular-nums ${victoryStats.alarmsTriggered === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {victoryStats.alarmsTriggered} {victoryStats.alarmsTriggered === 0 && '★ (CLEAN)'}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">BODIES CONCEALED</div>
                <div className="text-lg font-bold text-sky-400 tabular-nums">{victoryStats.bodiesHidden}</div>
              </div>
            </div>

            {/* Next Mission / Replay Action Buttons */}
            <div className="mt-7 flex flex-col gap-3">
              <button
                onClick={() => {
                  const nextIdx = (currentLevelIndex + 1) % LEVELS.length;
                  startMission(nextIdx);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>NEXT CONTRACT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => startMission(currentLevelIndex)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> REPLAY FOR BETTER RATING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. AGENT FIELD MANUAL / HELP MODAL */}
      {showHelpModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl max-w-lg w-full shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-rose-400">
                <FileText className="w-4 h-4" /> ICA AGENT FIELD MANUAL
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <h4 className="font-bold text-white text-sm">1. MOVEMENT & STEALTH</h4>
                <p className="text-slate-400 mt-0.5">
                  Hold <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Shift</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">C</kbd> to crouch. Sneaking halves your acoustic footstep range and cuts guard vision range in half.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">2. GUARD VISION CONES</h4>
                <p className="text-slate-400 mt-0.5">
                  Cyan cones represent unaware guards. Yellow indicates suspicion (investigating sound or glimpses). Red represents full alert and weapon fire. Walls and cover block vision.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">3. SILENT TAKEDOWNS & BODY STASHING</h4>
                <p className="text-slate-400 mt-0.5">
                  Approach behind an unaware guard to trigger <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">[SPACE] Takedown</kbd>. Hold <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Space</kbd> over eliminated bodies to drag them into closets/lockers so patrols don't sound the alarm.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">4. DISTRACTION COINS</h4>
                <p className="text-slate-400 mt-0.5">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">F</kbd> or Right-Click anywhere to toss a coin. Guards investigate the metallic clink, allowing you to bypass choke-points.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">5. AGENT INSTINCT</h4>
                <p className="text-slate-400 mt-0.5">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Q</kbd> to activate Agent Instinct, revealing the red VIP target and guard silhouettes through walls.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">6. ICA SECURITY THREAT LEVELS</h4>
                <div className="text-slate-400 mt-1 space-y-1 text-[11px]">
                  <div>• <b className="text-emerald-300">CASUAL (Recruit)</b>: Reduced vision cones (85%), slower guard detection (0.7x), and 80 HP guard pools.</div>
                  <div>• <b className="text-sky-300">PROFESSIONAL (Operative)</b>: Standard ICA operational parameters. 100% vision, 1.0x detection speed, 100 HP guards.</div>
                  <div>• <b className="text-rose-400">MASTER (Elite Threat)</b>: Extended vision cones (125%), instant razor-sharp detection (1.6x), heavy guard armor (160 HP), and deadlier weapon fire (+40% dmg) with a 1.5x score bonus.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer"
            >
              CLOSE MANUAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
