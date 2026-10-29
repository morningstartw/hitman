export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory' | 'briefing';

export type AlertLevel = 'safe' | 'suspicious' | 'combat' | 'alarm';

export type EntityStance = 'normal' | 'sneak' | 'drag';

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: 'wall' | 'cover' | 'glass' | 'door';
  color?: string;
}

export interface RayIntersection {
  point: Point;
  distance: number;
  angle: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  decay: number;
  type?: 'blood' | 'spark' | 'smoke' | 'casing' | 'dust';
}

export interface FloorDecal {
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

export interface SoundRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  isPlayer: boolean;
  active: boolean;
  distanceTraveled: number;
  maxDistance: number;
}

export interface DistractionCoin {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  landed: boolean;
  bounces: number;
}

export interface LockerOrHidingSpot {
  x: number;
  y: number;
  w: number;
  h: number;
  occupied: boolean;
  label: string;
}

export type GuardBehavior = 'PATROL' | 'INVESTIGATING' | 'ALERTED' | 'SEARCHING' | 'RETURNING';

export interface Guard {
  id: string;
  x: number;
  y: number;
  angle: number; // in radians
  targetAngle: number;
  speed: number;
  health: number;
  isDead: boolean;
  isTarget: boolean; // Is VIP?
  name: string;
  role: 'guard' | 'vip' | 'civilian' | 'heavy';
  suitColor: string;
  
  // Patrol
  patrolPoints: Point[];
  currentPatrolIndex: number;
  waitTimer: number;
  
  // AI State
  behavior: GuardBehavior;
  investigateTarget: Point | null;
  investigateTimer: number;
  suspicionMeter: number; // 0 to 1
  canSeePlayer: boolean;
  shotCooldown: number;
  
  // Vision
  fov: number; // Radians
  viewDistance: number;
  lastKnownPlayerPos: Point | null;
}

export interface SecurityCamera {
  id: string;
  x: number;
  y: number;
  baseAngle: number;
  angle: number;
  sweepAngle: number; // oscillation range (arc in radians)
  sweepSpeed: number; // speed of rotation
  viewDistance: number;
  fov: number;
  suspicionMeter: number;
  disabled: boolean;
  name?: string;
  sweepDirection?: number; // 1 or -1
  dwellTimer?: number; // pause at endpoints
  dwellDuration?: number; // seconds
  isTriggeringAlarm?: boolean;
}

export interface Player {
  x: number;
  y: number;
  angle: number;
  speed: number;
  health: number;
  maxHealth: number;
  stance: EntityStance;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  coins: number;
  instinctEnergy: number; // 0 to 100
  isUsingInstinct: boolean;
  reloading: boolean;
  reloadProgress: number;
  draggedGuardId: string | null;
}

export interface TargetInfo {
  id: string;
  name: string;
  bio?: string;
  isDead: boolean;
}

export interface LevelConfig {
  id: string;
  title: string;
  subtitle: string;
  briefing: string;
  targetName: string;
  targetBio: string;
  targetsSummary?: string;
  mapWidth: number;
  mapHeight: number;
  playerStart: Point;
  extractionPoint: Point;
  extractionRadius: number;
  walls: Wall[];
  guards: Omit<
    Guard,
    | 'id'
    | 'health'
    | 'isDead'
    | 'behavior'
    | 'investigateTarget'
    | 'investigateTimer'
    | 'suspicionMeter'
    | 'canSeePlayer'
    | 'shotCooldown'
    | 'lastKnownPlayerPos'
    | 'targetAngle'
    | 'waitTimer'
  >[];
  cameras?: SecurityCamera[];
  lockers?: LockerOrHidingSpot[];
}

export interface MissionStats {
  timeElapsed: number; // in seconds
  shotsFired: number;
  kills: number;
  targetsEliminated: number;
  totalTargets?: number;
  bodiesHidden: number;
  alarmsTriggered: number;
  rank: 'SILENT ASSASSIN' | 'GHOST' | 'OPERATIVE' | 'ENFORCER' | 'FAILED';
  stealthScore: number;
  difficulty?: DifficultyLevel;
}

export type DifficultyLevel = 'casual' | 'professional' | 'master';

export interface DifficultyConfig {
  id: DifficultyLevel;
  name: string;
  badge: string;
  subtitle: string;
  description: string;
  color: string;
  detectionMultiplier: number;
  visionMultiplier: number;
  guardHealthMultiplier: number;
  guardDamageMultiplier: number;
  cameraDetectionMultiplier: number;
  scoreMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  casual: {
    id: 'casual',
    name: 'CASUAL',
    badge: 'RECRUIT',
    subtitle: 'Relaxed Security Protocol',
    description: 'Reduced vision cones, slower guard detection, and lower guard HP pool. Recommended for reconnaissance.',
    color: '#10b981',
    detectionMultiplier: 0.7,
    visionMultiplier: 0.85,
    guardHealthMultiplier: 0.8,
    guardDamageMultiplier: 0.75,
    cameraDetectionMultiplier: 0.75,
    scoreMultiplier: 0.8,
  },
  professional: {
    id: 'professional',
    name: 'PROFESSIONAL',
    badge: 'OPERATIVE',
    subtitle: 'Standard ICA Protocol',
    description: 'The authentic Hitman experience. Standard vision ranges, balanced detection speeds, and standard guard health.',
    color: '#38bdf8',
    detectionMultiplier: 1.0,
    visionMultiplier: 1.0,
    guardHealthMultiplier: 1.0,
    guardDamageMultiplier: 1.0,
    cameraDetectionMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  master: {
    id: 'master',
    name: 'MASTER',
    badge: 'ELITE THREAT',
    subtitle: 'Maximum Facility Security',
    description: 'Extended vision sightlines, razor-sharp detection, reinforced guard armor (+60% HP), and lethal weapon fire.',
    color: '#f43f5e',
    detectionMultiplier: 1.6,
    visionMultiplier: 1.25,
    guardHealthMultiplier: 1.6,
    guardDamageMultiplier: 1.4,
    cameraDetectionMultiplier: 1.5,
    scoreMultiplier: 1.5,
  },
};

