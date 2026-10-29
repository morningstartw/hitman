import { sound } from './audio';
import {
  AlertLevel,
  Bullet,
  DifficultyLevel,
  DIFFICULTY_CONFIGS,
  DistractionCoin,
  FloorDecal,
  Guard,
  GuardBehavior,
  LevelConfig,
  MissionStats,
  Particle,
  Player,
  Point,
  SecurityCamera,
  SoundRing,
  Wall,
} from './types';
import {
  calculateVisionPolygon,
  hasLineOfSight,
  isPointInCone,
  resolveCircleRectCollision,
} from './raycast';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: {
    ammo: number;
    reserveAmmo: number;
    coins: number;
    health: number;
    alertLevel: AlertLevel;
    targetEliminated: boolean;
    canExfiltrate: boolean;
    instinctEnergy: number;
    actionPrompt: string | null;
    activeCameraAlarmCount: number;
    targetsRemaining: number;
    totalTargets: number;
    targets: { id: string; name: string; isDead: boolean }[];
    minimapMode: 'corner' | 'expanded' | 'hidden';
    difficulty: DifficultyLevel;
  }) => void;
  onGameOver: (reason: string) => void;
  onVictory: (stats: MissionStats) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Level data
  private level!: LevelConfig;
  private walls: Wall[] = [];
  private guards: Guard[] = [];
  private cameras: SecurityCamera[] = [];
  private lockers: { x: number; y: number; w: number; h: number; occupied: boolean; label: string }[] = [];

  // Entities & State
  public player!: Player;
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private floorDecals: FloorDecal[] = [];
  private soundRings: SoundRing[] = [];
  private coins: DistractionCoin[] = [];

  // Minimap Mode
  public minimapMode: 'corner' | 'expanded' | 'hidden' = 'corner';
  private difficulty: DifficultyLevel = 'professional';

  // Input states
  private keys: Record<string, boolean> = {};
  private mousePos: Point = { x: 0, y: 0 };
  private screenMousePos: Point = { x: 0, y: 0 };
  private isMouseDown: boolean = false;
  private canShoot: boolean = true;

  // Camera & Screen
  private camera: Point = { x: 0, y: 0 };
  private screenShake: number = 0;
  private hitstopTimer: number = 0;

  // Loop & Timing
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private missionTime: number = 0;

  // Stats tracking
  private stats: MissionStats = {
    timeElapsed: 0,
    shotsFired: 0,
    kills: 0,
    targetsEliminated: 0,
    totalTargets: 1,
    bodiesHidden: 0,
    alarmsTriggered: 0,
    rank: 'SILENT ASSASSIN',
    stealthScore: 10000,
  };

  private currentActionPrompt: string | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.callbacks = callbacks;

    this.bindEvents();
    this.handleResize();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.throwCoin();
    });
    window.addEventListener('resize', this.handleResize);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('resize', this.handleResize);
    sound.stopAlarm();
  }

  private handleResize = () => {
    const parent = this.canvas.parentElement;
    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    } else {
      this.canvas.width = window.innerWidth || 1280;
      this.canvas.height = window.innerHeight || 720;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;

    // Distraction Coin
    if (e.key === 'f' || e.key === 'F') {
      this.throwCoin();
    }

    // Reload
    if ((e.key === 'r' || e.key === 'R') && !this.player.reloading && this.player.ammo < this.player.maxAmmo) {
      this.startReload();
    }

    // Minimap Mode Toggle (M)
    if (e.key === 'm' || e.key === 'M') {
      this.toggleMinimap();
    }

    // Action Key (Space / E / G): Takedown / Drag Body / Stash
    if (e.code === 'Space' || e.key === 'e' || e.key === 'E' || e.key === 'g' || e.key === 'G') {
      this.performContextAction();
    }

    // Instinct mode toggle (Q)
    if (e.key === 'q' || e.key === 'Q') {
      if (this.player.instinctEnergy > 15) {
        this.player.isUsingInstinct = !this.player.isUsingInstinct;
        if (this.player.isUsingInstinct) {
          sound.playInstinct();
        }
      }
    }
  };

  // Safe canvas arc helper preventing any IndexSizeError: radius provided is negative
  public safeArc(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): boolean {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }
    const r = Math.max(0.01, radius);
    ctx.arc(x, y, r, startAngle, endAngle, counterclockwise);
    return true;
  }

  public toggleMinimap(): 'corner' | 'expanded' | 'hidden' {
    if (this.minimapMode === 'corner') {
      this.minimapMode = 'expanded';
    } else if (this.minimapMode === 'expanded') {
      this.minimapMode = 'hidden';
    } else {
      this.minimapMode = 'corner';
    }
    return this.minimapMode;
  }

  public setMinimapMode(mode: 'corner' | 'expanded' | 'hidden') {
    this.minimapMode = mode;
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private handleBlur = () => {
    this.keys = {};
    this.isMouseDown = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.screenMousePos.x = e.clientX - rect.left;
    this.screenMousePos.y = e.clientY - rect.top;

    this.mousePos.x = this.screenMousePos.x + this.camera.x;
    this.mousePos.y = this.screenMousePos.y + this.camera.y;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.tryShootPlayer();
    } else if (e.button === 2) {
      this.throwCoin();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
      this.canShoot = true;
    }
  };

  public setDifficulty(difficulty: DifficultyLevel) {
    this.difficulty = difficulty;
    if (this.level) {
      this.loadLevel(this.level, difficulty);
    }
  }

  public getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  public loadLevel(levelConfig: LevelConfig, difficulty: DifficultyLevel = this.difficulty) {
    this.difficulty = difficulty;
    const diff = DIFFICULTY_CONFIGS[this.difficulty];
    this.level = levelConfig;
    this.walls = [...levelConfig.walls];
    this.lockers = (levelConfig.lockers || []).map((l) => ({ ...l }));

    // Initialize rotatable security cameras with scanning sweep states and difficulty adjustments
    this.cameras = (levelConfig.cameras || []).map((c) => ({
      ...c,
      angle: c.baseAngle - c.sweepAngle / 2,
      sweepDirection: 1,
      dwellTimer: 0,
      dwellDuration: this.difficulty === 'master' ? 0.8 : 1.2,
      viewDistance: Math.round(c.viewDistance * (this.difficulty === 'master' ? 1.15 : this.difficulty === 'casual' ? 0.9 : 1.0)),
      suspicionMeter: 0,
      disabled: false,
      isTriggeringAlarm: false,
    }));

    // Reset stats
    this.missionTime = 0;
    this.stats = {
      timeElapsed: 0,
      shotsFired: 0,
      kills: 0,
      targetsEliminated: 0,
      totalTargets: levelConfig.guards.filter((g) => g.isTarget).length || 1,
      bodiesHidden: 0,
      alarmsTriggered: 0,
      rank: 'SILENT ASSASSIN',
      stealthScore: 10000,
      difficulty: this.difficulty,
    };

    // Initialize player
    this.player = {
      x: levelConfig.playerStart.x,
      y: levelConfig.playerStart.y,
      angle: 0,
      speed: 3.2,
      health: 100,
      maxHealth: 100,
      stance: 'normal',
      ammo: 7,
      maxAmmo: 7,
      reserveAmmo: 21,
      coins: 3,
      instinctEnergy: 100,
      isUsingInstinct: false,
      reloading: false,
      reloadProgress: 0,
      draggedGuardId: null,
    };

    // Initialize guards with difficulty scaling: HP pool and vision distance
    this.guards = levelConfig.guards.map((g, idx) => {
      const baseHp = g.role === 'heavy' ? 160 : g.isTarget ? 100 : 100;
      const scaledHp = Math.round(baseHp * diff.guardHealthMultiplier);
      const scaledViewDist = Math.round(g.viewDistance * diff.visionMultiplier);

      return {
        ...g,
        id: `guard-${idx}`,
        health: scaledHp,
        viewDistance: scaledViewDist,
        isDead: false,
        behavior: 'PATROL' as GuardBehavior,
        targetAngle: g.angle,
        waitTimer: 0,
        investigateTarget: null,
        investigateTimer: 0,
        suspicionMeter: 0,
        canSeePlayer: false,
        shotCooldown: 0,
        lastKnownPlayerPos: null,
      };
    });

    // Reset runtime objects
    this.bullets = [];
    this.particles = [];
    this.floorDecals = [];
    this.soundRings = [];
    this.coins = [];
    this.screenShake = 0;
    this.hitstopTimer = 0;

    // Center camera
    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
  }

  public isTitlePreview: boolean = false;

  public startTitlePreview() {
    this.isTitlePreview = true;
    this.isRunning = true;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public start() {
    this.isTitlePreview = false;
    this.isRunning = true;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public pause() {
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    sound.stopAlarm();
  }

  public resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    sound.stopAlarm();
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning || this.isPaused) return;

    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.render();
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // ----------------------------------------------------
  // UPDATE SYSTEMS
  // ----------------------------------------------------
  private update(dt: number) {
    if (this.isTitlePreview) {
      this.missionTime += dt;
      // Ambient slow pan across facility
      const targetCamX = this.level.mapWidth / 2 - this.canvas.width / 2 + Math.sin(this.missionTime * 0.2) * 240;
      const targetCamY = this.level.mapHeight / 2 - this.canvas.height / 2 + Math.cos(this.missionTime * 0.15) * 180;
      this.camera.x = Math.max(0, Math.min(this.level.mapWidth - this.canvas.width, targetCamX));
      this.camera.y = Math.max(0, Math.min(this.level.mapHeight - this.canvas.height, targetCamY));

      this.updateCameras(dt);
      this.updateGuards(dt);
      this.updateParticles(dt);
      return;
    }

    this.missionTime += dt;
    this.stats.timeElapsed = Math.floor(this.missionTime);

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    this.updatePlayer(dt);
    this.updateCoins(dt);
    this.updateBullets(dt);
    this.updateCameras(dt);
    this.updateGuards(dt);
    this.updateParticles(dt);
    this.updateSoundRings(dt);
    this.updateCamera(dt);
    this.checkExfiltration();

    // Determine overall Alert Level
    const anyInCombat = this.guards.some((g) => g.behavior === 'ALERTED');
    const cameraAlarmCount = this.cameras.filter((c) => c.isTriggeringAlarm).length;
    const anyCameraAlarm = cameraAlarmCount > 0;
    const anySuspicious =
      this.guards.some((g) => g.behavior === 'INVESTIGATING' || g.suspicionMeter > 0.2) ||
      this.cameras.some((c) => !c.disabled && c.suspicionMeter > 0.25);

    let alertLevel: AlertLevel = 'safe';
    if (anyCameraAlarm) {
      alertLevel = 'alarm';
    } else if (anyInCombat) {
      alertLevel = 'combat';
    } else if (anySuspicious) {
      alertLevel = 'suspicious';
    }

    if (alertLevel === 'combat' || alertLevel === 'alarm') {
      sound.startAlarm();
    } else {
      sound.stopAlarm();
    }

    // Callbacks to UI
    const allTargets = this.guards.filter((g) => g.isTarget);
    const targetsEliminated = allTargets.filter((g) => g.isDead).length;
    const totalTargets = allTargets.length;
    const allTargetsDead = totalTargets === 0 || targetsEliminated === totalTargets;
    const canExfiltrate = allTargetsDead && this.isPlayerAtExtraction();
    const targetsList = allTargets.map((g) => ({
      id: g.id,
      name: g.name,
      isDead: g.isDead,
    }));

    this.callbacks.onStatsUpdate({
      ammo: this.player.ammo,
      reserveAmmo: this.player.reserveAmmo,
      coins: this.player.coins,
      health: Math.ceil(this.player.health),
      alertLevel,
      targetEliminated: allTargetsDead,
      canExfiltrate,
      instinctEnergy: Math.floor(this.player.instinctEnergy),
      actionPrompt: this.currentActionPrompt,
      activeCameraAlarmCount: cameraAlarmCount,
      targetsRemaining: totalTargets - targetsEliminated,
      totalTargets,
      targets: targetsList,
      minimapMode: this.minimapMode,
      difficulty: this.difficulty,
    });
  }

  // PLAYER UPDATE
  private updatePlayer(dt: number) {
    this.mousePos.x = this.screenMousePos.x + this.camera.x;
    this.mousePos.y = this.screenMousePos.y + this.camera.y;

    // Face mouse
    const dx = this.mousePos.x - this.player.x;
    const dy = this.mousePos.y - this.player.y;
    this.player.angle = Math.atan2(dy, dx);

    // Instinct recharge or drain
    if (this.player.isUsingInstinct) {
      this.player.instinctEnergy -= dt * 28;
      if (this.player.instinctEnergy <= 0) {
        this.player.instinctEnergy = 0;
        this.player.isUsingInstinct = false;
      }
    } else {
      this.player.instinctEnergy = Math.min(100, this.player.instinctEnergy + dt * 12);
    }

    // Reload progress
    if (this.player.reloading) {
      this.player.reloadProgress += dt * 1.5;
      if (this.player.reloadProgress >= 1) {
        const needed = this.player.maxAmmo - this.player.ammo;
        const take = Math.min(needed, this.player.reserveAmmo);
        this.player.ammo += take;
        this.player.reserveAmmo -= take;
        this.player.reloading = false;
        this.player.reloadProgress = 0;
      }
    }

    // Determine Stance & Speed
    const isSneakingKey = this.keys['shift'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['c'];
    if (this.player.draggedGuardId) {
      this.player.stance = 'drag';
    } else if (isSneakingKey) {
      this.player.stance = 'sneak';
    } else {
      this.player.stance = 'normal';
    }

    let moveSpeed = this.player.speed * 60;
    if (this.player.stance === 'sneak') {
      moveSpeed *= 0.55;
    } else if (this.player.stance === 'drag') {
      moveSpeed *= 0.45;
    }

    // Movement
    let moveX = 0;
    let moveY = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX = (moveX / len) * moveSpeed * dt;
      moveY = (moveY / len) * moveSpeed * dt;

      this.player.x += moveX;
      for (const wall of this.walls) {
        const res = resolveCircleRectCollision({ x: this.player.x, y: this.player.y, radius: 14 }, wall);
        this.player.x = res.x;
        this.player.y = res.y;
      }

      this.player.y += moveY;
      for (const wall of this.walls) {
        const res = resolveCircleRectCollision({ x: this.player.x, y: this.player.y, radius: 14 }, wall);
        this.player.x = res.x;
        this.player.y = res.y;
      }

      this.player.x = Math.max(30, Math.min(this.level.mapWidth - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(this.level.mapHeight - 30, this.player.y));

      if (Math.random() < 0.12) {
        const isSneak = this.player.stance === 'sneak';
        sound.playFootstep(isSneak);
        this.emitNoise(this.player.x, this.player.y, isSneak ? 35 : 120, isSneak ? '#38bdf8' : '#e2e8f0');
      }

      if (this.player.draggedGuardId) {
        const dragged = this.guards.find((g) => g.id === this.player.draggedGuardId);
        if (dragged) {
          dragged.x = this.player.x - Math.cos(this.player.angle) * 26;
          dragged.y = this.player.y - Math.sin(this.player.angle) * 26;
        }
      }
    }

    if (this.isMouseDown && this.canShoot) {
      this.tryShootPlayer();
    }

    this.updateContextPrompts();
  }

  // CONTEXT ACTIONS & PROMPTS
  private updateContextPrompts() {
    this.currentActionPrompt = null;

    if (this.player.draggedGuardId) {
      for (const locker of this.lockers) {
        if (!locker.occupied) {
          const dist = Math.hypot(this.player.x - (locker.x + locker.w / 2), this.player.y - (locker.y + locker.h / 2));
          if (dist < 60) {
            this.currentActionPrompt = `[SPACE] Stash Body in ${locker.label}`;
            return;
          }
        }
      }
      this.currentActionPrompt = `[SPACE] Drop Body`;
      return;
    }

    for (const guard of this.guards) {
      if (!guard.isDead) {
        const dist = Math.hypot(this.player.x - guard.x, this.player.y - guard.y);
        if (dist < 55) {
          const toPlayerAngle = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
          let angleDiff = Math.abs(toPlayerAngle - guard.angle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff > (100 * Math.PI) / 180) {
            this.currentActionPrompt = `[SPACE] Silent Takedown`;
            return;
          }
        }
      }
    }

    for (const guard of this.guards) {
      if (guard.isDead) {
        const dist = Math.hypot(this.player.x - guard.x, this.player.y - guard.y);
        if (dist < 45) {
          this.currentActionPrompt = `[SPACE] Drag Body`;
          return;
        }
      }
    }
  }

  private performContextAction() {
    if (this.player.draggedGuardId) {
      for (const locker of this.lockers) {
        if (!locker.occupied) {
          const dist = Math.hypot(this.player.x - (locker.x + locker.w / 2), this.player.y - (locker.y + locker.h / 2));
          if (dist < 65) {
            locker.occupied = true;
            const bodyIdx = this.guards.findIndex((g) => g.id === this.player.draggedGuardId);
            if (bodyIdx >= 0) {
              this.guards.splice(bodyIdx, 1);
            }
            this.player.draggedGuardId = null;
            this.stats.bodiesHidden++;
            sound.playBodyStash();
            this.createPuff(locker.x + locker.w / 2, locker.y + locker.h / 2, '#64748b');
            return;
          }
        }
      }
      this.player.draggedGuardId = null;
      sound.playBodyStash();
      return;
    }

    for (const guard of this.guards) {
      if (!guard.isDead) {
        const dist = Math.hypot(this.player.x - guard.x, this.player.y - guard.y);
        if (dist < 60) {
          const toPlayerAngle = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
          let angleDiff = Math.abs(toPlayerAngle - guard.angle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff > (100 * Math.PI) / 180) {
            guard.health = 0;
            guard.isDead = true;
            guard.behavior = 'RETURNING';
            this.stats.kills++;
            if (guard.isTarget) {
              this.stats.targetsEliminated++;
            }
            sound.playMeleeTakedown();
            this.hitstopTimer = 0.05;
            this.createBlood(guard.x, guard.y, 4);
            return;
          }
        }
      }
    }

    for (const guard of this.guards) {
      if (guard.isDead) {
        const dist = Math.hypot(this.player.x - guard.x, this.player.y - guard.y);
        if (dist < 48) {
          this.player.draggedGuardId = guard.id;
          sound.playBodyStash();
          return;
        }
      }
    }
  }

  // SHOOTING
  private tryShootPlayer() {
    if (this.player.reloading || this.player.ammo <= 0) {
      if (this.player.ammo <= 0 && !this.player.reloading) {
        this.startReload();
      }
      return;
    }

    this.canShoot = false;
    this.player.ammo--;
    this.stats.shotsFired++;

    const muzzleDist = 20;
    const muzzleX = this.player.x + Math.cos(this.player.angle) * muzzleDist + Math.cos(this.player.angle + Math.PI / 2) * 5;
    const muzzleY = this.player.y + Math.sin(this.player.angle) * muzzleDist + Math.sin(this.player.angle + Math.PI / 2) * 5;

    const spread = (Math.random() - 0.5) * 0.04;
    const bulletAngle = this.player.angle + spread;

    const bulletSpeed = 920;
    this.bullets.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(bulletAngle) * bulletSpeed,
      vy: Math.sin(bulletAngle) * bulletSpeed,
      speed: bulletSpeed,
      isPlayer: true,
      active: true,
      distanceTraveled: 0,
      maxDistance: 800,
    });

    sound.playSilencedShot();
    this.screenShake = 3;
    this.emitNoise(this.player.x, this.player.y, 90, '#94a3b8');

    this.createMuzzleParticles(muzzleX, muzzleY, this.player.angle);
    this.createShellCasing(this.player.x, this.player.y, this.player.angle + Math.PI / 2);

    if (this.player.ammo === 0) {
      setTimeout(() => this.startReload(), 200);
    }
  }

  private startReload() {
    if (this.player.reloading || this.player.reserveAmmo <= 0 || this.player.ammo >= this.player.maxAmmo) return;
    this.player.reloading = true;
    this.player.reloadProgress = 0;
    sound.playReload();
  }

  private throwCoin() {
    if (this.player.coins <= 0) return;
    this.player.coins--;

    const targetX = this.mousePos.x;
    const targetY = this.mousePos.y;

    this.coins.push({
      x: this.player.x,
      y: this.player.y,
      targetX,
      targetY,
      progress: 0,
      landed: false,
      bounces: 0,
    });
  }

  private emitNoise(x: number, y: number, radius: number, color: string) {
    this.soundRings.push({
      x,
      y,
      radius: 10,
      maxRadius: radius,
      opacity: 0.6,
      color,
    });

    for (const guard of this.guards) {
      if (guard.isDead) continue;
      const dist = Math.hypot(guard.x - x, guard.y - y);
      if (dist <= radius) {
        const los = hasLineOfSight({ x: guard.x, y: guard.y }, { x, y }, this.walls);
        const effectiveRadius = los ? radius : radius * 0.7;

        if (dist <= effectiveRadius) {
          if (guard.behavior === 'PATROL' || guard.behavior === 'SEARCHING' || guard.behavior === 'RETURNING') {
            guard.behavior = 'INVESTIGATING';
            guard.investigateTarget = { x, y };
            guard.investigateTimer = 6.0;
            guard.suspicionMeter = Math.max(guard.suspicionMeter, 0.4);
            sound.playSuspicionPing();
          }
        }
      }
    }
  }

  // BULLETS UPDATE (WALLS, GUARDS, AND SECURITY CAMERAS)
  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.distanceTraveled += b.speed * dt;

      if (b.distanceTraveled >= b.maxDistance) {
        b.active = false;
        continue;
      }

      // 1. Check wall collisions
      for (const wall of this.walls) {
        if (b.x >= wall.x && b.x <= wall.x + wall.w && b.y >= wall.y && b.y <= wall.y + wall.h) {
          b.active = false;
          sound.playHitWall();
          this.createSparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
          this.emitNoise(b.x, b.y, 110, '#f59e0b');
          break;
        }
      }

      if (!b.active) continue;

      // 2. Check player bullets hitting security cameras!
      if (b.isPlayer) {
        for (const cam of this.cameras) {
          if (cam.disabled) continue;
          const dist = Math.hypot(b.x - cam.x, b.y - cam.y);
          if (dist < 20) {
            b.active = false;
            cam.disabled = true;
            cam.suspicionMeter = 0;
            cam.isTriggeringAlarm = false;
            sound.playHitWall();
            this.screenShake = 4;
            // Electric spark explosion & smoke
            this.createSparks(cam.x, cam.y, Math.PI / 2);
            this.createSparks(cam.x, cam.y, -Math.PI / 2);
            this.createPuff(cam.x, cam.y, '#38bdf8');
            this.createPuff(cam.x, cam.y, '#64748b');
            this.emitNoise(cam.x, cam.y, 100, '#38bdf8');
            break;
          }
        }
      }

      if (!b.active) continue;

      // 3. Player bullet hitting guards
      if (b.isPlayer) {
        for (const guard of this.guards) {
          if (guard.isDead) continue;
          const dist = Math.hypot(b.x - guard.x, b.y - guard.y);
          if (dist < 18) {
            b.active = false;
            guard.health -= 60;
            this.hitstopTimer = 0.04;
            this.screenShake = 5;
            sound.playHitBody();
            this.createBlood(guard.x, guard.y, 8);

            if (guard.health <= 0) {
              guard.isDead = true;
              guard.health = 0;
              this.stats.kills++;
              if (guard.isTarget) {
                this.stats.targetsEliminated++;
              }
            } else {
              guard.behavior = 'ALERTED';
              guard.lastKnownPlayerPos = { x: this.player.x, y: this.player.y };
              this.stats.alarmsTriggered++;
              sound.playAlertStinger();
            }
            break;
          }
        }
      } else {
        // Enemy bullet hitting player
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < 16) {
          b.active = false;
          const dmg = Math.round(25 * DIFFICULTY_CONFIGS[this.difficulty].guardDamageMultiplier);
          this.player.health -= dmg;
          this.screenShake = 9;
          this.hitstopTimer = 0.05;
          sound.playHitBody();
          this.createBlood(this.player.x, this.player.y, 7);

          if (this.player.health <= 0) {
            this.player.health = 0;
            this.triggerGameOver('Eliminated in combat by facility security forces.');
          }
        }
      }
    }

    this.bullets = this.bullets.filter((b) => b.active);
  }

  // COINS UPDATE
  private updateCoins(dt: number) {
    for (const coin of this.coins) {
      if (coin.landed) continue;

      coin.progress += dt * 2.2;
      coin.x += (coin.targetX - coin.x) * (dt * 5);
      coin.y += (coin.targetY - coin.y) * (dt * 5);

      if (coin.progress >= 1) {
        coin.landed = true;
        coin.x = coin.targetX;
        coin.y = coin.targetY;
        sound.playCoinClink();
        this.emitNoise(coin.x, coin.y, 240, '#fbbf24');
        this.createPuff(coin.x, coin.y, '#fbbf24');
      }
    }
  }

  // ----------------------------------------------------
  // ROTATABLE SECURITY CAMERAS (ARC SCANNING & ALARM DISPATCH)
  // ----------------------------------------------------
  private updateCameras(dt: number) {
    for (const cam of this.cameras) {
      if (cam.disabled) continue;

      // Check if player is inside the camera's vision cone
      const canSee = isPointInCone(
        { x: cam.x, y: cam.y },
        cam.angle,
        cam.fov,
        cam.viewDistance,
        { x: this.player.x, y: this.player.y },
        this.walls
      );

      if (canSee) {
        // LOCK ANGLE: camera stops scanning and tracks the intruder
        const angleToPlayer = Math.atan2(this.player.y - cam.y, this.player.x - cam.x);
        cam.angle = angleToPlayer;

        // Suspicion accumulates quickly (faster if standing, slightly slower if sneaking, scaled by difficulty)
        const fillRate =
          (this.player.stance === 'sneak' ? 1.5 : 2.6) *
          DIFFICULTY_CONFIGS[this.difficulty].cameraDetectionMultiplier;
        cam.suspicionMeter = Math.min(1.0, cam.suspicionMeter + dt * fillRate);

        if (Math.random() < 0.08 && cam.suspicionMeter < 0.9) {
          sound.playSuspicionPing();
        }

        // TRIGGER ALARM WHEN FULLY DETECTED!
        if (cam.suspicionMeter >= 0.9) {
          const wasAlarming = cam.isTriggeringAlarm;
          cam.isTriggeringAlarm = true;

          if (!wasAlarming) {
            this.stats.alarmsTriggered++;
            sound.playAlertStinger();
            sound.startAlarm();
            this.screenShake = 6;
          }

          // Emit loud alarm sound waves centered on the camera
          if (Math.random() < 0.15) {
            this.emitNoise(cam.x, cam.y, 750, '#ef4444');
          }

          // ALERT ALL NEARBY GUARDS!
          const alertRadius = 750;
          for (const guard of this.guards) {
            if (guard.isDead) continue;
            const distToCam = Math.hypot(guard.x - cam.x, guard.y - cam.y);
            const distToPlayer = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);

            if (distToCam <= alertRadius || distToPlayer <= alertRadius) {
              if (guard.behavior !== 'ALERTED') {
                guard.behavior = 'ALERTED';
                guard.suspicionMeter = 1.0;
                guard.lastKnownPlayerPos = { x: this.player.x, y: this.player.y };
                guard.investigateTarget = { x: cam.x, y: cam.y };
              } else {
                guard.lastKnownPlayerPos = { x: this.player.x, y: this.player.y };
              }
            }
          }
        }
      } else {
        // Player not in view
        if (cam.isTriggeringAlarm) {
          // Alarm sustains for a short while after player escapes
          cam.suspicionMeter = Math.max(0, cam.suspicionMeter - dt * 0.35);
          if (cam.suspicionMeter <= 0) {
            cam.isTriggeringAlarm = false;
          }
        } else {
          cam.suspicionMeter = Math.max(0, cam.suspicionMeter - dt * 0.6);
        }

        // ROTATABLE ARC SWEEP WITH ENDPOINT DWELL PAUSE
        const minAngle = cam.baseAngle - cam.sweepAngle / 2;
        const maxAngle = cam.baseAngle + cam.sweepAngle / 2;
        const dir = cam.sweepDirection ?? 1;

        if ((cam.dwellTimer ?? 0) > 0) {
          cam.dwellTimer = (cam.dwellTimer ?? 0) - dt;
        } else {
          cam.angle += dir * cam.sweepSpeed * dt;

          if (cam.angle >= maxAngle) {
            cam.angle = maxAngle;
            cam.sweepDirection = -1;
            cam.dwellTimer = cam.dwellDuration ?? 1.2; // Dwell at edge of sweep
          } else if (cam.angle <= minAngle) {
            cam.angle = minAngle;
            cam.sweepDirection = 1;
            cam.dwellTimer = cam.dwellDuration ?? 1.2; // Dwell at edge of sweep
          }
        }
      }
    }
  }

  // GUARDS & AI UPDATE
  private updateGuards(dt: number) {
    for (const guard of this.guards) {
      if (guard.isDead) continue;

      const stealthDistanceMultiplier = this.player.stance === 'sneak' ? 0.6 : 1.0;
      const canSee = isPointInCone(
        { x: guard.x, y: guard.y },
        guard.angle,
        guard.fov,
        guard.viewDistance * stealthDistanceMultiplier,
        { x: this.player.x, y: this.player.y },
        this.walls
      );

      guard.canSeePlayer = canSee;

      // Guard checking if they see any dead bodies!
      for (const other of this.guards) {
        if (other.isDead && other.id !== guard.id) {
          const seesBody = isPointInCone(
            { x: guard.x, y: guard.y },
            guard.angle,
            guard.fov,
            guard.viewDistance,
            { x: other.x, y: other.y },
            this.walls
          );
          if (seesBody && guard.behavior !== 'ALERTED') {
            guard.behavior = 'ALERTED';
            guard.lastKnownPlayerPos = { x: other.x, y: other.y };
            this.stats.alarmsTriggered++;
            sound.playAlertStinger();
            this.emitNoise(guard.x, guard.y, 350, '#ef4444');
          }
        }
      }

      // Suspicion accumulation scaled by threat difficulty
      if (canSee) {
        const fillRate =
          (this.player.stance === 'sneak' ? 0.45 : 1.2) *
          DIFFICULTY_CONFIGS[this.difficulty].detectionMultiplier;
        guard.suspicionMeter += dt * fillRate;
        guard.lastKnownPlayerPos = { x: this.player.x, y: this.player.y };

        if (guard.suspicionMeter >= 1.0 && guard.behavior !== 'ALERTED') {
          guard.behavior = 'ALERTED';
          this.stats.alarmsTriggered++;
          sound.playAlertStinger();
          this.emitNoise(guard.x, guard.y, 350, '#ef4444');
        } else if (guard.suspicionMeter >= 0.3 && guard.behavior === 'PATROL') {
          guard.behavior = 'INVESTIGATING';
          guard.investigateTarget = { x: this.player.x, y: this.player.y };
          guard.investigateTimer = 5.0;
          sound.playSuspicionPing();
        }
      } else {
        if (guard.behavior !== 'ALERTED') {
          guard.suspicionMeter = Math.max(0, guard.suspicionMeter - dt * 0.25);
        }
      }

      // State machine logic
      switch (guard.behavior) {
        case 'PATROL': {
          if (guard.patrolPoints.length === 0) break;
          const targetPt = guard.patrolPoints[guard.currentPatrolIndex];
          const dist = Math.hypot(targetPt.x - guard.x, targetPt.y - guard.y);

          if (dist < 12) {
            guard.waitTimer += dt;
            if (guard.waitTimer > 2.0) {
              guard.waitTimer = 0;
              guard.currentPatrolIndex = (guard.currentPatrolIndex + 1) % guard.patrolPoints.length;
            }
          } else {
            const angleToTarget = Math.atan2(targetPt.y - guard.y, targetPt.x - guard.x);
            this.turnGuardTowards(guard, angleToTarget, dt * 3.5);
            this.moveGuardForward(guard, guard.speed * 45 * dt);
          }
          break;
        }

        case 'INVESTIGATING': {
          if (!guard.investigateTarget) {
            guard.behavior = 'RETURNING';
            break;
          }

          const dist = Math.hypot(guard.investigateTarget.x - guard.x, guard.investigateTarget.y - guard.y);
          const angleToTarget = Math.atan2(guard.investigateTarget.y - guard.y, guard.investigateTarget.x - guard.x);
          this.turnGuardTowards(guard, angleToTarget, dt * 4.0);

          if (dist > 16) {
            this.moveGuardForward(guard, guard.speed * 55 * dt);
          } else {
            guard.investigateTimer -= dt;
            guard.targetAngle += dt * 1.5;
            this.turnGuardTowards(guard, guard.targetAngle, dt * 2.0);

            if (guard.investigateTimer <= 0) {
              guard.behavior = 'RETURNING';
              guard.investigateTarget = null;
            }
          }
          break;
        }

        case 'ALERTED': {
          const targetPos = guard.canSeePlayer ? { x: this.player.x, y: this.player.y } : guard.lastKnownPlayerPos;

          if (targetPos) {
            const dist = Math.hypot(targetPos.x - guard.x, targetPos.y - guard.y);
            const angleToTarget = Math.atan2(targetPos.y - guard.y, targetPos.x - guard.x);
            this.turnGuardTowards(guard, angleToTarget, dt * 6.0);

            if (dist > 80) {
              this.moveGuardForward(guard, guard.speed * 75 * dt);
            }

            if (guard.canSeePlayer && dist < 420 && guard.role !== 'civilian') {
              guard.shotCooldown -= dt;
              if (guard.shotCooldown <= 0) {
                this.shootGuard(guard);
                guard.shotCooldown = guard.role === 'heavy' ? 0.35 : 0.85;
              }
            }
          }
          break;
        }

        case 'RETURNING': {
          if (guard.patrolPoints.length === 0) {
            guard.behavior = 'PATROL';
            break;
          }
          const patrolPt = guard.patrolPoints[guard.currentPatrolIndex];
          const dist = Math.hypot(patrolPt.x - guard.x, patrolPt.y - guard.y);

          if (dist < 20) {
            guard.behavior = 'PATROL';
            guard.suspicionMeter = 0;
          } else {
            const angleToTarget = Math.atan2(patrolPt.y - guard.y, patrolPt.x - guard.x);
            this.turnGuardTowards(guard, angleToTarget, dt * 3.5);
            this.moveGuardForward(guard, guard.speed * 48 * dt);
          }
          break;
        }
      }
    }
  }

  private turnGuardTowards(guard: Guard, targetAngle: number, speed: number) {
    let diff = targetAngle - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    guard.angle += Math.sign(diff) * Math.min(Math.abs(diff), speed);
  }

  private moveGuardForward(guard: Guard, amount: number) {
    const nextX = guard.x + Math.cos(guard.angle) * amount;
    const nextY = guard.y + Math.sin(guard.angle) * amount;

    guard.x = nextX;
    for (const wall of this.walls) {
      const res = resolveCircleRectCollision({ x: guard.x, y: guard.y, radius: 14 }, wall);
      guard.x = res.x;
      guard.y = res.y;
    }

    guard.y = nextY;
    for (const wall of this.walls) {
      const res = resolveCircleRectCollision({ x: guard.x, y: guard.y, radius: 14 }, wall);
      guard.x = res.x;
      guard.y = res.y;
    }
  }

  private shootGuard(guard: Guard) {
    const muzzleDist = 18;
    const muzzleX = guard.x + Math.cos(guard.angle) * muzzleDist;
    const muzzleY = guard.y + Math.sin(guard.angle) * muzzleDist;

    const spread = (Math.random() - 0.5) * 0.12;
    const bulletAngle = guard.angle + spread;
    const bulletSpeed = 700;

    this.bullets.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(bulletAngle) * bulletSpeed,
      vy: Math.sin(bulletAngle) * bulletSpeed,
      speed: bulletSpeed,
      isPlayer: false,
      active: true,
      distanceTraveled: 0,
      maxDistance: 650,
    });

    sound.playGuardShot();
    this.createMuzzleParticles(muzzleX, muzzleY, guard.angle);
    this.emitNoise(guard.x, guard.y, 380, '#ef4444');
  }

  // PARTICLES UPDATE
  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.vx *= 0.94;
      p.vy *= 0.94;

      if (p.type === 'blood' && p.life > 0.15 && Math.random() < 0.1) {
        this.floorDecals.push({
          x: p.x,
          y: p.y,
          size: Math.random() * 4 + 2,
          color: 'rgba(127, 29, 29, 0.75)',
          rotation: Math.random() * Math.PI * 2,
        });
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  // SOUND RINGS UPDATE
  private updateSoundRings(dt: number) {
    for (const r of this.soundRings) {
      r.radius += (r.maxRadius - r.radius) * (dt * 7);
      r.opacity -= dt * 1.4;
    }
    this.soundRings = this.soundRings.filter((r) => r.opacity > 0);
  }

  // CAMERA LERP
  private updateCamera(dt: number) {
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.canvas.height / 2;

    this.camera.x += (targetCamX - this.camera.x) * (dt * 8);
    this.camera.y += (targetCamY - this.camera.y) * (dt * 8);

    this.camera.x = Math.max(0, Math.min(this.level.mapWidth - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.level.mapHeight - this.canvas.height, this.camera.y));
  }

  // EXFILTRATION & WIN CHECK
  private isPlayerAtExtraction(): boolean {
    const dist = Math.hypot(this.player.x - this.level.extractionPoint.x, this.player.y - this.level.extractionPoint.y);
    return dist <= this.level.extractionRadius;
  }

  private checkExfiltration() {
    const allTargets = this.guards.filter((g) => g.isTarget);
    const allTargetsDead = allTargets.length === 0 || allTargets.every((g) => g.isDead);

    if (allTargetsDead && this.isPlayerAtExtraction()) {
      this.triggerVictory();
    }
  }

  private triggerVictory() {
    this.stop();
    sound.playVictory();

    const diff = DIFFICULTY_CONFIGS[this.difficulty];
    let rank: 'SILENT ASSASSIN' | 'GHOST' | 'OPERATIVE' | 'ENFORCER' | 'FAILED' = 'SILENT ASSASSIN';
    let baseScore = 10000;

    baseScore -= this.stats.alarmsTriggered * 2500;
    baseScore -= (this.stats.kills - (this.stats.totalTargets || 1)) * 600;
    baseScore -= Math.floor(this.missionTime) * 10;
    baseScore += this.stats.bodiesHidden * 500;

    if (this.stats.alarmsTriggered === 0 && this.stats.kills <= (this.stats.totalTargets || 1)) {
      rank = 'SILENT ASSASSIN';
    } else if (this.stats.alarmsTriggered === 0) {
      rank = 'GHOST';
    } else if (this.stats.alarmsTriggered <= 2) {
      rank = 'OPERATIVE';
    } else {
      rank = 'ENFORCER';
    }

    this.stats.rank = rank;
    this.stats.difficulty = this.difficulty;
    this.stats.stealthScore = Math.max(0, Math.round(baseScore * diff.scoreMultiplier));
    this.callbacks.onVictory(this.stats);
  }

  private triggerGameOver(reason: string) {
    this.stop();
    sound.playGameOver();
    this.callbacks.onGameOver(reason);
  }

  // PARTICLE GENERATORS
  private createMuzzleParticles(x: number, y: number, angle: number) {
    for (let i = 0; i < 6; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = Math.random() * 80 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 0,
        maxLife: 0.15,
        color: '#fef08a',
        size: Math.random() * 2.5 + 1.5,
        decay: 1,
        type: 'spark',
      });
    }
  }

  private createShellCasing(x: number, y: number, angle: number) {
    const speed = Math.random() * 60 + 50;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 3.0,
      color: '#d97706',
      size: 2.5,
      decay: 0.2,
      type: 'casing',
    });
  }

  private createBlood(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 20;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.45,
        color: '#dc2626',
        size: Math.random() * 3 + 2,
        decay: 1,
        type: 'blood',
      });
    }
  }

  private createSparks(x: number, y: number, bounceAngle: number) {
    for (let i = 0; i < 6; i++) {
      const angle = bounceAngle + (Math.random() - 0.5) * 1.4;
      const speed = Math.random() * 160 + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.25,
        color: '#f59e0b',
        size: 2.2,
        decay: 1,
        type: 'spark',
      });
    }
  }

  private createPuff(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 40 + 10;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4,
        color,
        size: Math.random() * 4 + 2,
        decay: 1,
        type: 'smoke',
      });
    }
  }

  // ----------------------------------------------------
  // RENDERING PIPELINE (60 FPS PURE CANVAS)
  // ----------------------------------------------------
  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.drawFloor(ctx);
    this.drawExtractionZone(ctx);
    this.drawDecals(ctx);
    this.drawLockersAndCover(ctx);
    this.drawDeadBodies(ctx);
    this.drawVisionCones(ctx);
    this.drawWalls(ctx);
    this.drawCoinsAndSounds(ctx);
    this.drawCameras(ctx);
    this.drawGuards(ctx);
    this.drawPlayer(ctx);
    this.drawProjectilesAndParticles(ctx);

    if (this.player.isUsingInstinct) {
      this.drawInstinctOverlay(ctx);
    }

    ctx.restore();

    this.drawScreenHUD(ctx);
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D) {
    const tileSize = 60;
    const startX = Math.floor(this.camera.x / tileSize) * tileSize;
    const startY = Math.floor(this.camera.y / tileSize) * tileSize;
    const endX = startX + this.canvas.width + tileSize * 2;
    const endY = startY + this.canvas.height + tileSize * 2;

    ctx.strokeStyle = '#141c2b';
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  private drawExtractionZone(ctx: CanvasRenderingContext2D) {
    const pt = this.level.extractionPoint;
    const radius = this.level.extractionRadius;
    const allTargets = this.guards.filter((g) => g.isTarget);
    const targetDead = allTargets.length === 0 || allTargets.every((g) => g.isDead);

    const pulse = Math.sin(this.missionTime * 3) * 0.2 + 0.8;
    ctx.save();
    ctx.beginPath();
    this.safeArc(ctx, pt.x, pt.y, Math.max(1, radius * pulse), 0, Math.PI * 2);
    ctx.fillStyle = targetDead ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)';
    ctx.fill();
    ctx.strokeStyle = targetDead ? '#10b981' : '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = targetDead ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(targetDead ? 'EXTRACTION POINT' : 'EXFIL (LOCKED)', pt.x, pt.y + 4);
    ctx.restore();
  }

  private drawDecals(ctx: CanvasRenderingContext2D) {
    for (const d of this.floorDecals) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.size, d.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLockersAndCover(ctx: CanvasRenderingContext2D) {
    for (const l of this.lockers) {
      ctx.fillStyle = l.occupied ? '#1e293b' : '#334155';
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.strokeStyle = l.occupied ? '#64748b' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(l.x, l.y, l.w, l.h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(l.occupied ? 'FULL' : 'HIDE', l.x + l.w / 2, l.y + l.h / 2 + 3);
    }
  }

  private drawDeadBodies(ctx: CanvasRenderingContext2D) {
    for (const guard of this.guards) {
      if (guard.isDead) {
        ctx.save();
        ctx.translate(guard.x, guard.y);
        ctx.rotate(guard.angle);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(14, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(185, 28, 28, 0.4)';
        ctx.beginPath();
        ctx.arc(-2, 4, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private drawVisionCones(ctx: CanvasRenderingContext2D) {
    // 1. Guard Vision Cones
    for (const guard of this.guards) {
      if (guard.isDead) continue;

      const stealthDist = this.player.stance === 'sneak' ? 0.6 : 1.0;
      const poly = calculateVisionPolygon(
        { x: guard.x, y: guard.y },
        guard.angle,
        guard.fov,
        guard.viewDistance * stealthDist,
        this.walls,
        32
      );

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();

      let coneFill = 'rgba(56, 189, 248, 0.12)';
      let coneStroke = 'rgba(56, 189, 248, 0.35)';

      if (guard.behavior === 'ALERTED') {
        coneFill = 'rgba(239, 68, 68, 0.28)';
        coneStroke = 'rgba(239, 68, 68, 0.7)';
      } else if (guard.behavior === 'INVESTIGATING' || guard.suspicionMeter > 0.1) {
        coneFill = 'rgba(245, 158, 11, 0.22)';
        coneStroke = 'rgba(245, 158, 11, 0.6)';
      }

      ctx.fillStyle = coneFill;
      ctx.fill();
      ctx.strokeStyle = coneStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Rotatable Security Camera Vision Cones with Laser Scanlines
    for (const cam of this.cameras) {
      if (cam.disabled) continue;

      const poly = calculateVisionPolygon({ x: cam.x, y: cam.y }, cam.angle, cam.fov, cam.viewDistance, this.walls, 28);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();

      const isAlarm = cam.isTriggeringAlarm;
      const isSuspicious = cam.suspicionMeter > 0.2;

      // Color coding: Alarm (flashing red) vs Suspicious (amber) vs Normal (cool cyber violet)
      let coneFill = 'rgba(139, 92, 246, 0.14)';
      let coneStroke = 'rgba(167, 139, 250, 0.5)';

      if (isAlarm) {
        const strobe = Math.sin(this.missionTime * 14) > 0 ? 0.38 : 0.18;
        coneFill = `rgba(239, 68, 68, ${strobe})`;
        coneStroke = '#ef4444';
      } else if (isSuspicious) {
        coneFill = 'rgba(245, 158, 11, 0.24)';
        coneStroke = '#f59e0b';
      }

      ctx.fillStyle = coneFill;
      ctx.fill();
      ctx.strokeStyle = coneStroke;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Animated traveling laser scanline through camera cone
      const rawDist = (Math.abs(this.missionTime) * 180) % Math.max(10, cam.viewDistance);
      const scanDist = Math.max(2, Math.abs(rawDist));
      if (Number.isFinite(scanDist) && scanDist > 0) {
        ctx.beginPath();
        this.safeArc(ctx, cam.x, cam.y, scanDist, cam.angle - cam.fov / 2, cam.angle + cam.fov / 2);
        ctx.strokeStyle = isAlarm ? 'rgba(239, 68, 68, 0.7)' : isSuspicious ? 'rgba(245, 158, 11, 0.6)' : 'rgba(192, 132, 252, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ----------------------------------------------------
  // DRAW ROTATABLE SECURITY CAMERAS (HARDWARE & REC STATUS)
  // ----------------------------------------------------
  private drawCameras(ctx: CanvasRenderingContext2D) {
    for (const cam of this.cameras) {
      ctx.save();
      ctx.translate(cam.x, cam.y);

      // Mount bracket on wall
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // If camera has been shot / disabled
      if (cam.disabled) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(-7, -7, 14, 14);

        // Broken lens X
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();

        // Occasional wire spark
        if (Math.random() < 0.05) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      // Camera body rotates with current sweep angle!
      ctx.rotate(cam.angle);

      // Pivot arm
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -3, 8, 6);

      // Camera housing box
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, -6, 16, 12);
      ctx.strokeStyle = cam.isTriggeringAlarm ? '#ef4444' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(6, -6, 16, 12);

      // Sunshade / Hood
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, -8, 16, 2);

      // Surveillance Lens
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(22, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Blinking REC / Status LED
      let ledColor = '#10b981'; // Green (Safe)
      if (cam.isTriggeringAlarm) {
        ledColor = Math.sin(this.missionTime * 12) > 0 ? '#ef4444' : '#7f1d1d'; // Blinking red
      } else if (cam.suspicionMeter > 0.15) {
        ledColor = '#f59e0b'; // Amber (Detecting)
      }

      ctx.fillStyle = ledColor;
      ctx.beginPath();
      ctx.arc(10, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Floating Camera Alert Text
      if (cam.isTriggeringAlarm) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ALARM !', cam.x, cam.y - 18);
      } else if (cam.suspicionMeter > 0.15) {
        // Circular detection progress
        ctx.save();
        ctx.beginPath();
        ctx.arc(cam.x, cam.y - 18, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cam.suspicionMeter);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D) {
    for (const wall of this.walls) {
      if (wall.type === 'cover') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.moveTo(wall.x + wall.w, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.h);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }
    }
  }

  private drawCoinsAndSounds(ctx: CanvasRenderingContext2D) {
    for (const r of this.soundRings) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(0.1, r.radius), 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.opacity);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    for (const c of this.coins) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGuards(ctx: CanvasRenderingContext2D) {
    for (const guard of this.guards) {
      if (guard.isDead) continue;

      ctx.save();
      ctx.translate(guard.x, guard.y);
      ctx.rotate(guard.angle);

      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = guard.isTarget ? '#e11d48' : guard.suitColor;
      ctx.fill();
      ctx.strokeStyle = guard.isTarget ? '#fda4af' : '#64748b';
      ctx.lineWidth = guard.isTarget ? 2.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = guard.isTarget ? '#be123c' : '#1e293b';
      ctx.fillRect(4, -10, 8, 5);
      ctx.fillRect(4, 5, 8, 5);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 3, 10, 3);

      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = guard.isTarget ? '#fecdd3' : '#e2e8f0';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, -1, 3, 2);

      ctx.restore();

      if (guard.behavior === 'ALERTED') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 22);
      } else if (guard.suspicionMeter > 0.05 || guard.behavior === 'INVESTIGATING') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 22, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 22, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicionMeter);
        ctx.fillStyle = '#f59e0b';
        ctx.lineTo(guard.x, guard.y - 22);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 18);
        ctx.restore();
      }

      if (guard.isTarget) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET', guard.x, guard.y - 34);
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.angle);

    const isSneak = this.player.stance === 'sneak';
    ctx.beginPath();
    ctx.arc(0, 0, isSneak ? 11 : 14, 0, Math.PI * 2);
    ctx.fillStyle = isSneak ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.7)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, isSneak ? 11 : 13, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = isSneak ? '#38bdf8' : '#e2e8f0';
    ctx.lineWidth = isSneak ? 2 : 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, -9, 8, 4);
    ctx.fillRect(4, 5, 8, 4);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(9, 0);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(10, 4, 12, 3);
    ctx.fillStyle = '#334155';
    ctx.fillRect(20, 3, 10, 5);

    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.restore();
  }

  private drawProjectilesAndParticles(ctx: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.isPlayer ? 2.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = b.isPlayer ? '#38bdf8' : '#f87171';
      ctx.fill();

      ctx.strokeStyle = b.isPlayer ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - (b.vx / b.speed) * 16, b.y - (b.vy / b.speed) * 16);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawInstinctOverlay(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const guard of this.guards) {
      if (guard.isDead) continue;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = guard.isTarget ? '#f43f5e' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Also highlight active security cameras in instinct mode!
    for (const cam of this.cameras) {
      if (cam.disabled) continue;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawScreenHUD(ctx: CanvasRenderingContext2D) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const mx = this.screenMousePos.x;
    const my = this.screenMousePos.y;

    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    const gap = 6;
    const length = 12;
    ctx.beginPath();
    ctx.moveTo(mx, my - gap);
    ctx.lineTo(mx, my - gap - length);
    ctx.moveTo(mx, my + gap);
    ctx.lineTo(mx, my + gap + length);
    ctx.moveTo(mx - gap, my);
    ctx.lineTo(mx - gap - length, my);
    ctx.moveTo(mx + gap, my);
    ctx.lineTo(mx + gap + length, my);
    ctx.stroke();

    const livingTargets = this.guards.filter((g) => g.isTarget && !g.isDead);
    for (const target of livingTargets) {
      const screenTargetX = target.x - this.camera.x;
      const screenTargetY = target.y - this.camera.y;

      const isOffscreen = screenTargetX < 50 || screenTargetX > w - 50 || screenTargetY < 50 || screenTargetY > h - 50;

      if (isOffscreen) {
        const centerScreenX = w / 2;
        const centerScreenY = h / 2;
        const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);

        const edgeDist = Math.min(w / 2 - 40, h / 2 - 40);
        const arrowX = centerScreenX + Math.cos(angle) * edgeDist;
        const arrowY = centerScreenY + Math.sin(angle) * edgeDist;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        const shortName = target.name.split(' ')[0] || 'TARGET';
        ctx.fillText(shortName, 0, -12);
        ctx.restore();
      }
    }

    ctx.restore();

    // ----------------------------------------------------
    // MINIMAP / TACTICAL SAT-LINK OVERLAY (HUD CORNER)
    // ----------------------------------------------------
    if (!this.isTitlePreview) {
      this.drawMinimap(ctx);
    }
  }

  // ----------------------------------------------------
  // MINIMAP / TACTICAL SAT-LINK OVERLAY
  // ----------------------------------------------------
  private drawMinimap(ctx: CanvasRenderingContext2D) {
    if (this.minimapMode === 'hidden') return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const isExpanded = this.minimapMode === 'expanded';

    // Dimensions & placement
    let boxW: number;
    let boxH: number;
    let boxX: number;
    let boxY: number;

    if (isExpanded) {
      boxW = Math.min(1080, w - 40);
      boxH = Math.min(740, h - 70);
      boxX = (w - boxW) / 2;
      boxY = (h - boxH) / 2;
    } else {
      // Corner HUD overlay (Enlarged and crisp: 320x220)
      boxW = Math.min(320, Math.max(260, w * 0.28));
      boxH = Math.min(220, Math.max(180, h * 0.3));
      boxX = w - boxW - 20;
      boxY = 120;
    }

    ctx.save();

    // Backdrop shadow and panel
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = isExpanded ? 24 : 12;

    // Dark glassmorphism container
    ctx.fillStyle = isExpanded ? 'rgba(6, 10, 20, 0.94)' : 'rgba(8, 13, 26, 0.82)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.shadowBlur = 0;

    // High-tech cyber border
    ctx.strokeStyle = isExpanded ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Corner tech bracket accents
    const bracketSize = isExpanded ? 14 : 9;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + bracketSize);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + bracketSize, boxY);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketSize, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + bracketSize);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - bracketSize);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + bracketSize, boxY + boxH);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketSize, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - bracketSize);
    ctx.stroke();

    // Top Header Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(boxX + 1, boxY + 1, boxW - 2, 22);

    // Pulsing live satellite beacon
    const livePulse = Math.sin(this.missionTime * 5) > 0;
    ctx.fillStyle = livePulse ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    this.safeArc(ctx, boxX + 12, boxY + 11, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isExpanded ? 'SAT-LINK TACTICAL MAP · OVERVIEW' : 'TACTICAL SAT-LINK', boxX + 22, boxY + 15);

    // Toggle hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(isExpanded ? '[M] MINIMIZE' : '[M] EXPAND', boxX + boxW - 10, boxY + 15);

    // Inner map viewport
    const innerX = boxX + 8;
    const innerY = boxY + 26;
    const innerW = boxW - 16;
    const innerH = boxH - 46;

    // Coordinate conversion
    const scaleX = innerW / this.level.mapWidth;
    const scaleY = innerH / this.level.mapHeight;
    const scale = Math.min(scaleX, scaleY);
    const drawW = this.level.mapWidth * scale;
    const drawH = this.level.mapHeight * scale;
    const mapOffX = innerX + (innerW - drawW) / 2;
    const mapOffY = innerY + (innerH - drawH) / 2;

    const toMiniX = (wx: number) => mapOffX + wx * scale;
    const toMiniY = (wy: number) => mapOffY + wy * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, innerH);
    ctx.clip();

    // Faint tactical radar grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 0.5;
    const gridCols = 6;
    const gridRows = 4;
    for (let i = 1; i < gridCols; i++) {
      const gx = innerX + (innerW / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(gx, innerY);
      ctx.lineTo(gx, innerY + innerH);
      ctx.stroke();
    }
    for (let j = 1; j < gridRows; j++) {
      const gy = innerY + (innerH / gridRows) * j;
      ctx.beginPath();
      ctx.moveTo(innerX, gy);
      ctx.lineTo(innerX + innerW, gy);
      ctx.stroke();
    }

    // Rotating radar sweep line originating from player
    const sweepAngle = (this.missionTime * 2.5) % (Math.PI * 2);
    const pmx = toMiniX(this.player.x);
    const pmy = toMiniY(this.player.y);
    const sweepLength = Math.max(innerW, innerH) * 1.2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pmx, pmy);
    ctx.lineTo(pmx + Math.cos(sweepAngle) * sweepLength, pmy + Math.sin(sweepAngle) * sweepLength);
    ctx.stroke();

    // 1. Draw Walls & Obstacles
    for (const wall of this.walls) {
      const wx = toMiniX(wall.x);
      const wy = toMiniY(wall.y);
      const ww = wall.w * scale;
      const wh = wall.h * scale;

      if (wall.type === 'cover') {
        ctx.fillStyle = 'rgba(71, 85, 105, 0.55)';
        ctx.fillRect(wx, wy, Math.max(1, ww), Math.max(1, wh));
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(wx, wy, Math.max(1, ww), Math.max(1, wh));
      } else {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.fillRect(wx, wy, Math.max(1, ww), Math.max(1, wh));
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(wx, wy, Math.max(1, ww), Math.max(1, wh));
      }
    }

    // 2. Draw Extraction Zone
    const allTargets = this.guards.filter((g) => g.isTarget);
    const allTargetsDead = allTargets.length === 0 || allTargets.every((g) => g.isDead);
    const exX = toMiniX(this.level.extractionPoint.x);
    const exY = toMiniY(this.level.extractionPoint.y);
    const exR = Math.max(4, this.level.extractionRadius * scale);

    ctx.beginPath();
    this.safeArc(ctx, exX, exY, exR, 0, Math.PI * 2);
    ctx.fillStyle = allTargetsDead ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.15)';
    ctx.fill();
    ctx.strokeStyle = allTargetsDead ? '#10b981' : '#64748b';
    ctx.lineWidth = 1.2;
    if (!allTargetsDead) ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = allTargetsDead ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXFIL', exX, exY + 2.5);

    // 3. Draw Security Cameras
    for (const cam of this.cameras) {
      const cx = toMiniX(cam.x);
      const cy = toMiniY(cam.y);

      if (cam.disabled) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      } else {
        // Mini camera vision wedge
        const camViewDist = Math.max(10, cam.viewDistance * scale);
        ctx.fillStyle = cam.isTriggeringAlarm ? 'rgba(239, 68, 68, 0.4)' : 'rgba(192, 132, 252, 0.25)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        this.safeArc(ctx, cx, cy, camViewDist, cam.angle - cam.fov / 2, cam.angle + cam.fov / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = cam.isTriggeringAlarm ? '#ef4444' : '#c084fc';
        ctx.beginPath();
        this.safeArc(ctx, cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Draw TARGETS and THEIR CURRENT PATHS!
    for (const target of allTargets) {
      if (target.isDead) {
        // Neutralized Target
        const tx = toMiniX(target.x);
        const ty = toMiniY(target.y);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx - 3, ty - 3);
        ctx.lineTo(tx + 3, ty + 3);
        ctx.moveTo(tx + 3, ty - 3);
        ctx.lineTo(tx - 3, ty + 3);
        ctx.stroke();
        continue;
      }

      // TARGET'S PATROL PATH (Dotted line connecting all waypoints)
      if (target.patrolPoints && target.patrolPoints.length > 1) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        for (let i = 0; i < target.patrolPoints.length; i++) {
          const pt = target.patrolPoints[i];
          const mx = toMiniX(pt.x);
          const my = toMiniY(pt.y);
          if (i === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Waypoint nodes
        for (let i = 0; i < target.patrolPoints.length; i++) {
          const pt = target.patrolPoints[i];
          const mx = toMiniX(pt.x);
          const my = toMiniY(pt.y);
          ctx.fillStyle = 'rgba(251, 113, 133, 0.75)';
          ctx.beginPath();
          this.safeArc(ctx, mx, my, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // HIGHLIGHT TARGET'S CURRENT ACTIVE PATH (Heading towards current waypoint)
        const currentTargetPt = target.patrolPoints[target.currentPatrolIndex];
        if (currentTargetPt) {
          const startX = toMiniX(target.x);
          const startY = toMiniY(target.y);
          const endX = toMiniX(currentTargetPt.x);
          const endY = toMiniY(currentTargetPt.y);

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Small directional arrow on the active path segment
          const segAngle = Math.atan2(endY - startY, endX - startX);
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(segAngle);
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(-3, -3);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-3, 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // TARGET VIP LOCATION MARKER (Glowing pulsing diamond reticle)
      const tx = toMiniX(target.x);
      const ty = toMiniY(target.y);
      const pulseR = 3.5 + Math.sin(this.missionTime * 6) * 1.5;

      // Outer pulse aura
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      this.safeArc(ctx, tx, ty, pulseR + 3, 0, Math.PI * 2);
      ctx.fill();

      // Diamond reticle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 4.5);
      ctx.lineTo(tx + 4.5, ty);
      ctx.lineTo(tx, ty + 4.5);
      ctx.lineTo(tx - 4.5, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isExpanded ? target.name.split(' ')[0] : 'VIP', tx, ty - 6);
    }

    // 5. Draw Guards (Non-targets)
    for (const guard of this.guards) {
      if (guard.isTarget) continue;
      const gx = toMiniX(guard.x);
      const gy = toMiniY(guard.y);

      if (guard.isDead) {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.beginPath();
        this.safeArc(ctx, gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // Guard color based on alert state
      let guardColor = '#f59e0b'; // Amber normal
      if (guard.behavior === 'ALERTED') {
        guardColor = '#ef4444'; // Red alerted
      } else if (guard.behavior === 'INVESTIGATING' || guard.suspicionMeter > 0.2) {
        guardColor = '#fbbf24'; // Yellow searching
      }

      ctx.fillStyle = guardColor;
      ctx.beginPath();
      this.safeArc(ctx, gx, gy, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Directional pointer showing guard facing angle
      ctx.strokeStyle = guardColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(guard.angle) * 5, gy + Math.sin(guard.angle) * 5);
      ctx.stroke();
    }

    // 6. Draw Player (Hitman)
    const plx = toMiniX(this.player.x);
    const ply = toMiniY(this.player.y);

    // Player FOV cone indicator
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.moveTo(plx, ply);
    this.safeArc(ctx, plx, ply, 14, this.player.angle - 0.45, this.player.angle + 0.45);
    ctx.closePath();
    ctx.fill();

    // Player blip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    this.safeArc(ctx, plx, ply, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    this.safeArc(ctx, plx, ply, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // End clipping

    // Bottom Legend & Status Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(boxX + 1, boxY + boxH - 19, boxW - 2, 18);

    const eliminatedCount = allTargets.filter((g) => g.isDead).length;
    const totalCount = allTargets.length;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TGT: ${eliminatedCount}/${totalCount} KIA`, boxX + 8, boxY + boxH - 7);

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(isExpanded ? '[M] CLOSE' : '[M] MAP', boxX + boxW - 8, boxY + boxH - 7);

    ctx.restore();
  }
}
