import { LevelConfig, Wall } from './types';

// Helper to make room perimeter walls with a doorway
function makeRoom(
  x: number,
  y: number,
  w: number,
  h: number,
  wallThick: number,
  doorSide: 'top' | 'bottom' | 'left' | 'right',
  doorOffset: number,
  doorWidth: number
): Wall[] {
  const walls: Wall[] = [];

  // Top
  if (doorSide === 'top') {
    if (doorOffset > 0) walls.push({ x, y, w: doorOffset, h: wallThick, type: 'wall' });
    const rightPartX = x + doorOffset + doorWidth;
    const rightPartW = w - (doorOffset + doorWidth);
    if (rightPartW > 0) walls.push({ x: rightPartX, y, w: rightPartW, h: wallThick, type: 'wall' });
  } else {
    walls.push({ x, y, w, h: wallThick, type: 'wall' });
  }

  // Bottom
  if (doorSide === 'bottom') {
    if (doorOffset > 0) walls.push({ x, y: y + h - wallThick, w: doorOffset, h: wallThick, type: 'wall' });
    const rightPartX = x + doorOffset + doorWidth;
    const rightPartW = w - (doorOffset + doorWidth);
    if (rightPartW > 0) walls.push({ x: rightPartX, y: y + h - wallThick, w: rightPartW, h: wallThick, type: 'wall' });
  } else {
    walls.push({ x, y: y + h - wallThick, w, h: wallThick, type: 'wall' });
  }

  // Left
  if (doorSide === 'left') {
    if (doorOffset > 0) walls.push({ x, y, w: wallThick, h: doorOffset, type: 'wall' });
    const bottomPartY = y + doorOffset + doorWidth;
    const bottomPartH = h - (doorOffset + doorWidth);
    if (bottomPartH > 0) walls.push({ x, y: bottomPartY, w: wallThick, h: bottomPartH, type: 'wall' });
  } else {
    walls.push({ x, y, w: wallThick, h, type: 'wall' });
  }

  // Right
  if (doorSide === 'right') {
    if (doorOffset > 0) walls.push({ x: x + w - wallThick, y, w: wallThick, h: doorOffset, type: 'wall' });
    const bottomPartY = y + doorOffset + doorWidth;
    const bottomPartH = h - (doorOffset + doorWidth);
    if (bottomPartH > 0) walls.push({ x: x + w - wallThick, y: bottomPartY, w: wallThick, h: bottomPartH, type: 'wall' });
  } else {
    walls.push({ x: x + w - wallThick, y, w: wallThick, h, type: 'wall' });
  }

  return walls;
}

// -----------------------------------------------------------------------------------------
// CONTRACT 01: PENTHOUSE HORIZON (2 Targets: Victor Vance & Marcus Sterling)
// -----------------------------------------------------------------------------------------
const level1: LevelConfig = {
  id: 'penthouse',
  title: 'CONTRACT 01: PENTHOUSE HORIZON',
  subtitle: 'The Glass Spire · 74th Floor',
  briefing:
    'Targets are Victor Vance, corrupt tech CEO, Marcus Sterling, his brutal private security chief, and Sloan Kelly, evidence custodian destroying biometric records. Infiltrate the luxury penthouse, eliminate all targets quietly, and exfiltrate through the rooftop helipad.',
  targetName: 'Victor Vance',
  targetBio: 'CEO of Aegis BioTech. Holed up in his executive penthouse sanctuary.',
  targetsSummary: 'Targets: Victor Vance (CEO), Marcus Sterling (Chief) & Sloan Kelly (Data)',
  mapWidth: 1600,
  mapHeight: 1200,
  playerStart: { x: 120, y: 1080 },
  extractionPoint: { x: 1480, y: 140 },
  extractionRadius: 55,
  walls: [
    // Outer perimeter
    { x: 40, y: 40, w: 1520, h: 20, type: 'wall' },
    { x: 40, y: 1140, w: 1520, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1120, type: 'wall' },
    { x: 1540, y: 40, w: 20, h: 1120, type: 'wall' },

    // Lobby / Entrance Room (Bottom-Left)
    ...makeRoom(40, 880, 420, 280, 16, 'top', 160, 90),

    // Security Monitoring Room (Left-Center)
    ...makeRoom(40, 480, 360, 320, 16, 'right', 110, 80),

    // Central Lounge / Fountain room (Center)
    { x: 500, y: 480, w: 20, h: 220, type: 'wall' },
    { x: 500, y: 780, w: 20, h: 220, type: 'wall' },
    { x: 880, y: 480, w: 20, h: 200, type: 'wall' },
    { x: 880, y: 760, w: 20, h: 240, type: 'wall' },
    // Center luxury cover pillars
    { x: 620, y: 580, w: 60, h: 60, type: 'cover' },
    { x: 740, y: 580, w: 60, h: 60, type: 'cover' },
    { x: 620, y: 740, w: 60, h: 60, type: 'cover' },
    { x: 740, y: 740, w: 60, h: 60, type: 'cover' },

    // Conference Hall (Top-Left)
    ...makeRoom(40, 60, 480, 360, 16, 'bottom', 210, 90),
    { x: 160, y: 180, w: 240, h: 100, type: 'cover' },

    // Executive Office (Top-Right)
    ...makeRoom(940, 60, 580, 420, 16, 'bottom', 180, 90),
    { x: 1180, y: 180, w: 140, h: 70, type: 'cover' },
    { x: 970, y: 90, w: 120, h: 30, type: 'cover' },

    // Archive / Server Room (Bottom-Right)
    ...makeRoom(980, 680, 540, 440, 16, 'left', 140, 90),
    { x: 1060, y: 760, w: 40, h: 140, type: 'cover' },
    { x: 1180, y: 760, w: 40, h: 140, type: 'cover' },
    { x: 1300, y: 760, w: 40, h: 140, type: 'cover' },
    { x: 1420, y: 760, w: 40, h: 140, type: 'cover' },
  ],
  lockers: [
    { x: 90, y: 910, w: 50, h: 30, occupied: false, label: 'Locker A-1' },
    { x: 430, y: 520, w: 50, h: 30, occupied: false, label: 'Closet 02' },
    { x: 950, y: 640, w: 50, h: 30, occupied: false, label: 'Janitor Bin' },
    { x: 1460, y: 500, w: 50, h: 30, occupied: false, label: 'Vent Chute' },
  ],
  guards: [
    // 1. Lobby Guard
    {
      x: 320,
      y: 980,
      angle: Math.PI,
      speed: 1.1,
      isTarget: false,
      name: 'Lobby Sentinel',
      role: 'guard',
      suitColor: '#2b3648',
      patrolPoints: [
        { x: 320, y: 980 },
        { x: 180, y: 980 },
        { x: 180, y: 1080 },
        { x: 320, y: 1080 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    // 2. Main Corridor Patrol
    {
      x: 480,
      y: 840,
      angle: 0,
      speed: 1.3,
      isTarget: false,
      name: 'Hallway Patrol',
      role: 'guard',
      suitColor: '#2b3648',
      patrolPoints: [
        { x: 480, y: 840 },
        { x: 920, y: 840 },
        { x: 920, y: 440 },
        { x: 480, y: 440 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    // 3. Central Lounge Guard
    {
      x: 700,
      y: 660,
      angle: Math.PI / 2,
      speed: 1.0,
      isTarget: false,
      name: 'Lounge Enforcer',
      role: 'guard',
      suitColor: '#2b3648',
      patrolPoints: [
        { x: 700, y: 660 },
        { x: 800, y: 660 },
        { x: 800, y: 720 },
        { x: 620, y: 720 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
    // 4. TARGET 2: Marcus Sterling (Security Chief)
    {
      x: 1060,
      y: 520,
      angle: Math.PI / 2,
      speed: 1.25,
      isTarget: true,
      name: 'Marcus Sterling (Security Chief)',
      role: 'heavy',
      suitColor: '#991b1b', // Dark Red Enforcer Vest
      patrolPoints: [
        { x: 1040, y: 520 },
        { x: 1320, y: 520 },
        { x: 1320, y: 640 },
        { x: 1040, y: 640 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 310,
    },
    // 5. TARGET 3: Sloan Kelly (Data Custodian)
    {
      x: 1220,
      y: 980,
      angle: 0,
      speed: 0.9,
      isTarget: true,
      name: 'Sloan Kelly (Data Custodian)',
      role: 'vip',
      suitColor: '#b91c1c',
      patrolPoints: [
        { x: 1040, y: 980 },
        { x: 1400, y: 980 },
        { x: 1400, y: 1100 },
        { x: 1040, y: 1100 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 250,
    },
    // 6. TARGET 1: Victor Vance (CEO)
    {
      x: 1240,
      y: 240,
      angle: Math.PI / 2,
      speed: 0.8,
      isTarget: true,
      name: 'Victor Vance (CEO)',
      role: 'vip',
      suitColor: '#e11d48', // Striking crimson suit
      patrolPoints: [
        { x: 1240, y: 240 },
        { x: 1060, y: 200 },
        { x: 1060, y: 320 },
        { x: 1400, y: 320 },
        { x: 1400, y: 150 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 230,
    },
  ],
  cameras: [
    {
      id: 'cam-lobby',
      name: 'Lobby Entrance CCTV',
      x: 430,
      y: 890,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.8,
      sweepSpeed: 0.75,
      viewDistance: 250,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-lounge',
      name: 'Central Atrium CCTV',
      x: 870,
      y: 490,
      baseAngle: Math.PI,
      angle: Math.PI,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.6,
      viewDistance: 270,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-office',
      name: 'Executive Suite CCTV',
      x: 955,
      y: 470,
      baseAngle: (5 * Math.PI) / 4,
      angle: (5 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.4,
      sweepSpeed: 0.65,
      viewDistance: 260,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 02: BLACK VAULT (2 Targets: Director Kovacs & Dr. Aris Thorne)
// -----------------------------------------------------------------------------------------
const level2: LevelConfig = {
  id: 'bunker',
  title: 'CONTRACT 02: BLACK VAULT',
  subtitle: 'Sub-Level 04 · Intelligence Bunker',
  briefing:
    'Targets are Director Kovacs and chief cryptographer Dr. Aris Thorne. They are running unauthorized telemetry interception networks. Silence both before exfiltrating through the blast door.',
  targetName: 'Director Kovacs',
  targetBio: 'Mastermind of covert telemetry and illegal wetwork networks.',
  targetsSummary: 'Targets: Director Kovacs & Dr. Aris Thorne (Chief Cryptographer)',
  mapWidth: 1700,
  mapHeight: 1200,
  playerStart: { x: 120, y: 140 },
  extractionPoint: { x: 1560, y: 1080 },
  extractionRadius: 60,
  walls: [
    // Outer boundary
    { x: 40, y: 40, w: 1620, h: 20, type: 'wall' },
    { x: 40, y: 1140, w: 1620, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1120, type: 'wall' },
    { x: 1640, y: 40, w: 20, h: 1120, type: 'wall' },

    // Entry AirLock
    ...makeRoom(40, 40, 360, 280, 16, 'bottom', 140, 90),

    // Central Security Hub
    ...makeRoom(540, 380, 580, 420, 18, 'top', 240, 90),
    { x: 780, y: 540, w: 100, h: 100, type: 'cover' },

    // Left Armory
    ...makeRoom(40, 480, 420, 380, 16, 'right', 140, 90),
    { x: 120, y: 600, w: 180, h: 40, type: 'cover' },
    { x: 120, y: 720, w: 180, h: 40, type: 'cover' },

    // Hallway barriers
    { x: 480, y: 180, w: 20, h: 160, type: 'wall' },
    { x: 740, y: 60, w: 20, h: 180, type: 'wall' },
    { x: 1040, y: 160, w: 20, h: 180, type: 'wall' },

    // Director Kovacs Inner Sanctum
    ...makeRoom(540, 840, 520, 300, 16, 'top', 200, 90),
    { x: 720, y: 960, w: 160, h: 60, type: 'cover' },

    // Generator & Crypto Lab Room (Right)
    ...makeRoom(1220, 200, 420, 440, 16, 'left', 160, 90),
    { x: 1340, y: 340, w: 80, h: 80, type: 'cover' },
    { x: 1480, y: 340, w: 80, h: 80, type: 'cover' },

    // South Hallway Pillar
    { x: 1300, y: 840, w: 80, h: 80, type: 'cover' },
  ],
  lockers: [
    { x: 180, y: 350, w: 50, h: 30, occupied: false, label: 'Locker C-4' },
    { x: 480, y: 680, w: 50, h: 30, occupied: false, label: 'Tool Chest' },
    { x: 1140, y: 780, w: 50, h: 30, occupied: false, label: 'Industrial Bin' },
    { x: 1420, y: 1000, w: 50, h: 30, occupied: false, label: 'Vent Grate' },
  ],
  guards: [
    {
      x: 320,
      y: 240,
      angle: 0,
      speed: 1.1,
      isTarget: false,
      name: 'Airlock Sentinel',
      role: 'guard',
      suitColor: '#334155',
      patrolPoints: [
        { x: 320, y: 240 },
        { x: 420, y: 240 },
        { x: 420, y: 100 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    {
      x: 600,
      y: 260,
      angle: Math.PI / 2,
      speed: 1.3,
      isTarget: false,
      name: 'North Patrol',
      role: 'guard',
      suitColor: '#334155',
      patrolPoints: [
        { x: 600, y: 260 },
        { x: 920, y: 260 },
        { x: 1180, y: 260 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    // TARGET 2: Dr. Aris Thorne
    {
      x: 1380,
      y: 320,
      angle: -Math.PI / 2,
      speed: 0.9,
      isTarget: true,
      name: 'Dr. Aris Thorne (Cryptographer)',
      role: 'vip',
      suitColor: '#f43f5e',
      patrolPoints: [
        { x: 1380, y: 320 },
        { x: 1540, y: 320 },
        { x: 1540, y: 520 },
        { x: 1320, y: 520 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    {
      x: 740,
      y: 460,
      angle: 0,
      speed: 1.2,
      isTarget: false,
      name: 'Hub Sentry',
      role: 'heavy',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 620, y: 460 },
        { x: 1040, y: 460 },
        { x: 1040, y: 720 },
        { x: 620, y: 720 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 310,
    },
    {
      x: 240,
      y: 680,
      angle: 0,
      speed: 1.0,
      isTarget: false,
      name: 'Armory Keeper',
      role: 'guard',
      suitColor: '#334155',
      patrolPoints: [
        { x: 240, y: 560 },
        { x: 380, y: 560 },
        { x: 380, y: 800 },
        { x: 240, y: 800 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    {
      x: 1340,
      y: 960,
      angle: Math.PI,
      speed: 1.2,
      isTarget: false,
      name: 'Exfil Guard',
      role: 'heavy',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 1340, y: 960 },
        { x: 1500, y: 960 },
        { x: 1500, y: 1100 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 300,
    },
    // TARGET 1: Director Kovacs
    {
      x: 780,
      y: 980,
      angle: -Math.PI / 2,
      speed: 0.75,
      isTarget: true,
      name: 'Director Kovacs (VIP)',
      role: 'vip',
      suitColor: '#be123c',
      patrolPoints: [
        { x: 780, y: 980 },
        { x: 620, y: 920 },
        { x: 940, y: 920 },
        { x: 940, y: 1040 },
        { x: 620, y: 1040 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 230,
    },
  ],
  cameras: [
    {
      id: 'cam-airlock',
      name: 'Airlock Security CCTV',
      x: 390,
      y: 70,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.7,
      viewDistance: 260,
      fov: (50 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-corridor',
      name: 'Generator Corridor CCTV',
      x: 1180,
      y: 70,
      baseAngle: Math.PI / 2,
      angle: Math.PI / 2,
      sweepAngle: Math.PI / 3,
      sweepSpeed: 0.8,
      viewDistance: 270,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-vault',
      name: 'Vault Sanctum CCTV',
      x: 550,
      y: 850,
      baseAngle: Math.PI / 4,
      angle: Math.PI / 4,
      sweepAngle: Math.PI / 2.5,
      sweepSpeed: 0.6,
      viewDistance: 260,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 03: NIGHT DOCKS (2 Targets: Don Moretti & Jimmy "The Viper" Falcone)
// -----------------------------------------------------------------------------------------
const level3: LevelConfig = {
  id: 'docks',
  title: 'CONTRACT 03: NIGHT DOCKS',
  subtitle: 'Pier 42 · Smuggler Basin',
  briefing:
    'Targets are Don Moretti and his vicious right-hand enforcer Jimmy "The Viper" Falcone. Infiltrate the foggy shipping container yard, eliminate both syndicate leaders, and reach the escape speedboat.',
  targetName: 'Don Moretti',
  targetBio: 'Syndicate kingpin overseeing illicit weapon shipments.',
  targetsSummary: 'Targets: Don Moretti (Boss) & Jimmy Falcone (Enforcer)',
  mapWidth: 1800,
  mapHeight: 1200,
  playerStart: { x: 120, y: 1100 },
  extractionPoint: { x: 1680, y: 160 },
  extractionRadius: 65,
  walls: [
    // Outer perimeter
    { x: 40, y: 40, w: 1720, h: 20, type: 'wall' },
    { x: 40, y: 1140, w: 1720, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1120, type: 'wall' },
    { x: 1740, y: 40, w: 20, h: 1120, type: 'wall' },

    // Shipping Container rows
    { x: 160, y: 840, w: 260, h: 80, type: 'cover' },
    { x: 160, y: 640, w: 260, h: 80, type: 'cover' },
    { x: 160, y: 400, w: 260, h: 80, type: 'cover' },
    { x: 160, y: 160, w: 260, h: 80, type: 'cover' },

    { x: 560, y: 220, w: 90, h: 280, type: 'cover' },
    { x: 740, y: 220, w: 90, h: 280, type: 'cover' },
    { x: 560, y: 660, w: 90, h: 320, type: 'cover' },
    { x: 740, y: 660, w: 90, h: 320, type: 'cover' },

    // Harbor Master Office (Top-Right)
    ...makeRoom(1100, 60, 560, 420, 16, 'left', 160, 90),
    { x: 1260, y: 200, w: 180, h: 70, type: 'cover' },

    // Warehouse Bay (Bottom-Right)
    ...makeRoom(1040, 640, 660, 480, 16, 'top', 180, 100),
    { x: 1160, y: 780, w: 140, h: 140, type: 'cover' },
    { x: 1420, y: 780, w: 140, h: 140, type: 'cover' },
  ],
  lockers: [
    { x: 450, y: 840, w: 50, h: 30, occupied: false, label: 'Dumpster A' },
    { x: 670, y: 550, w: 50, h: 30, occupied: false, label: 'Wooden Crate' },
    { x: 1050, y: 400, w: 50, h: 30, occupied: false, label: 'Cargo Bin' },
    { x: 1620, y: 600, w: 50, h: 30, occupied: false, label: 'Storage Box' },
  ],
  guards: [
    // TARGET 2: Jimmy "The Viper" Falcone
    {
      x: 320,
      y: 980,
      angle: 0,
      speed: 1.25,
      isTarget: true,
      name: 'Jimmy "The Viper" Falcone',
      role: 'heavy',
      suitColor: '#b91c1c',
      patrolPoints: [
        { x: 180, y: 980 },
        { x: 460, y: 980 },
        { x: 460, y: 740 },
        { x: 180, y: 740 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    {
      x: 480,
      y: 540,
      angle: -Math.PI / 2,
      speed: 1.3,
      isTarget: false,
      name: 'Aisle Roamer',
      role: 'guard',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 480, y: 160 },
        { x: 480, y: 880 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    {
      x: 880,
      y: 420,
      angle: Math.PI / 2,
      speed: 1.3,
      isTarget: false,
      name: 'Crane Operator Guard',
      role: 'heavy',
      suitColor: '#0f172a',
      patrolPoints: [
        { x: 880, y: 220 },
        { x: 880, y: 840 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 310,
    },
    {
      x: 1020,
      y: 300,
      angle: 0,
      speed: 1.1,
      isTarget: false,
      name: 'Office Gatekeeper',
      role: 'guard',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 960, y: 220 },
        { x: 1040, y: 380 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
    {
      x: 1260,
      y: 680,
      angle: Math.PI / 2,
      speed: 1.2,
      isTarget: false,
      name: 'Warehouse Guard',
      role: 'heavy',
      suitColor: '#0f172a',
      patrolPoints: [
        { x: 1140, y: 980 },
        { x: 1540, y: 980 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 300,
    },
    // TARGET 1: Don Moretti
    {
      x: 1380,
      y: 280,
      angle: 0,
      speed: 0.8,
      isTarget: true,
      name: 'Don Moretti (Boss)',
      role: 'vip',
      suitColor: '#dc2626',
      patrolPoints: [
        { x: 1380, y: 280 },
        { x: 1220, y: 280 },
        { x: 1220, y: 140 },
        { x: 1540, y: 140 },
        { x: 1540, y: 380 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
  ],
  cameras: [
    {
      id: 'cam-yard',
      name: 'Container Yard CCTV',
      x: 550,
      y: 180,
      baseAngle: Math.PI / 2,
      angle: Math.PI / 2,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.65,
      viewDistance: 280,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-pier',
      name: 'Pier 42 North CCTV',
      x: 1070,
      y: 80,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.6,
      sweepSpeed: 0.7,
      viewDistance: 270,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-hangar',
      name: 'Smuggler Bay CCTV',
      x: 1050,
      y: 650,
      baseAngle: Math.PI / 4,
      angle: Math.PI / 4,
      sweepAngle: Math.PI / 2.3,
      sweepSpeed: 0.6,
      viewDistance: 280,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 04: THE NEON CASINO (2 Targets: Madame Chen & Alexei Rostov)
// -----------------------------------------------------------------------------------------
const level4: LevelConfig = {
  id: 'casino',
  title: 'CONTRACT 04: THE NEON CASINO',
  subtitle: 'The Velvet Dragon · Macau Skyrise',
  briefing:
    'Targets are Triad financier Madame Chen and illegal arms broker Alexei Rostov. They are laundering cartel war bonds in the private penthouse casino. Neutralize both and exfiltrate via the VIP skybridge.',
  targetName: 'Madame Chen',
  targetBio: 'Syndicate treasurer and high-stakes casino operator.',
  targetsSummary: 'Targets: Madame Chen (Financier) & Alexei Rostov (Arms Broker)',
  mapWidth: 1800,
  mapHeight: 1200,
  playerStart: { x: 120, y: 1100 },
  extractionPoint: { x: 1660, y: 160 },
  extractionRadius: 60,
  walls: [
    // Outer walls
    { x: 40, y: 40, w: 1720, h: 20, type: 'wall' },
    { x: 40, y: 1140, w: 1720, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1120, type: 'wall' },
    { x: 1740, y: 40, w: 20, h: 1120, type: 'wall' },

    // Grand Casino Gaming Floor (Center)
    // Roulette & Blackjack tables (Cover)
    { x: 260, y: 780, w: 160, h: 70, type: 'cover' },
    { x: 520, y: 780, w: 160, h: 70, type: 'cover' },
    { x: 260, y: 580, w: 160, h: 70, type: 'cover' },
    { x: 520, y: 580, w: 160, h: 70, type: 'cover' },

    // Casino Vault / Cashier Cage (Left-Top)
    ...makeRoom(40, 60, 480, 380, 16, 'right', 140, 90),
    { x: 160, y: 160, w: 60, h: 140, type: 'cover' },
    { x: 280, y: 160, w: 60, h: 140, type: 'cover' },

    // Middle Partition dividing gaming floor from VIP lounge
    { x: 820, y: 60, w: 20, h: 440, type: 'wall' },
    { x: 820, y: 660, w: 20, h: 480, type: 'wall' },

    // Private VIP Salon (Right-Top) - Madame Chen's Suite
    ...makeRoom(1040, 60, 640, 440, 18, 'bottom', 200, 100),
    { x: 1220, y: 180, w: 220, h: 80, type: 'cover' }, // Velvet baccarat table

    // Service Kitchen & Backroom (Right-Bottom)
    ...makeRoom(980, 640, 720, 500, 16, 'left', 160, 90),
    { x: 1120, y: 760, w: 180, h: 60, type: 'cover' },
    { x: 1420, y: 760, w: 180, h: 60, type: 'cover' },
    { x: 1280, y: 940, w: 160, h: 60, type: 'cover' },
  ],
  lockers: [
    { x: 100, y: 480, w: 50, h: 30, occupied: false, label: 'Locker B-2' },
    { x: 740, y: 880, w: 50, h: 30, occupied: false, label: 'Linen Hamper' },
    { x: 920, y: 380, w: 50, h: 30, occupied: false, label: 'Bar Closet' },
    { x: 1600, y: 540, w: 50, h: 30, occupied: false, label: 'Service Chute' },
  ],
  guards: [
    // Entrance Bouncer
    {
      x: 280,
      y: 1020,
      angle: -Math.PI / 2,
      speed: 1.1,
      isTarget: false,
      name: 'Casino Bouncer',
      role: 'heavy',
      suitColor: '#1e1b4b',
      patrolPoints: [
        { x: 280, y: 1020 },
        { x: 540, y: 1020 },
        { x: 540, y: 920 },
        { x: 280, y: 920 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
    // Floor Pit Boss
    {
      x: 440,
      y: 440,
      angle: 0,
      speed: 1.2,
      isTarget: false,
      name: 'Gaming Floor Sentry',
      role: 'guard',
      suitColor: '#312e81',
      patrolPoints: [
        { x: 440, y: 440 },
        { x: 740, y: 440 },
        { x: 740, y: 720 },
        { x: 440, y: 720 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    // TARGET 1: Alexei Rostov (in Vault corridors)
    {
      x: 260,
      y: 240,
      angle: Math.PI / 2,
      speed: 0.9,
      isTarget: true,
      name: 'Alexei Rostov (Arms Dealer)',
      role: 'heavy',
      suitColor: '#e11d48',
      patrolPoints: [
        { x: 260, y: 240 },
        { x: 420, y: 240 },
        { x: 420, y: 120 },
        { x: 140, y: 120 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 270,
    },
    // VIP Bodyguard outside Salon
    {
      x: 940,
      y: 280,
      angle: 0,
      speed: 1.1,
      isTarget: false,
      name: 'Salon Gatekeeper',
      role: 'heavy',
      suitColor: '#1e1b4b',
      patrolPoints: [
        { x: 880, y: 160 },
        { x: 960, y: 440 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 310,
    },
    // TARGET 2: Madame Chen (in VIP Salon)
    {
      x: 1340,
      y: 220,
      angle: Math.PI / 2,
      speed: 0.75,
      isTarget: true,
      name: 'Madame Chen (Financier)',
      role: 'vip',
      suitColor: '#be123c',
      patrolPoints: [
        { x: 1340, y: 220 },
        { x: 1540, y: 220 },
        { x: 1540, y: 380 },
        { x: 1140, y: 380 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    // Kitchen Roamer
    {
      x: 1260,
      y: 840,
      angle: 0,
      speed: 1.2,
      isTarget: false,
      name: 'Kitchen Enforcer',
      role: 'guard',
      suitColor: '#312e81',
      patrolPoints: [
        { x: 1040, y: 840 },
        { x: 1620, y: 840 },
        { x: 1620, y: 1060 },
        { x: 1040, y: 1060 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
  ],
  cameras: [
    {
      id: 'cam-vault',
      name: 'Bullion Vault CCTV',
      x: 440,
      y: 80,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.3,
      sweepSpeed: 0.7,
      viewDistance: 280,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-floor',
      name: 'Gaming Floor CCTV',
      x: 780,
      y: 540,
      baseAngle: Math.PI,
      angle: Math.PI,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.65,
      viewDistance: 290,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-salon',
      name: 'VIP Salon Entrance CCTV',
      x: 1060,
      y: 520,
      baseAngle: -Math.PI / 4,
      angle: -Math.PI / 4,
      sweepAngle: Math.PI / 2.5,
      sweepSpeed: 0.6,
      viewDistance: 270,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 05: VILLA PARADISO (2 Targets: Ambassador Julian Croft & "The Ghost")
// -----------------------------------------------------------------------------------------
const level5: LevelConfig = {
  id: 'villa',
  title: 'CONTRACT 05: VILLA PARADISO',
  subtitle: 'Lake Como Estate · Italian Alps',
  briefing:
    'Targets are Corrupt Ambassador Julian Croft and rogue ICA assassin "The Ghost". Infiltrate the renaissance lakeside villa and hedge maze, eliminate both targets, and escape via the private speedboat dock.',
  targetName: 'Julian Croft',
  targetBio: 'Corrupt diplomat trading state secrets on foreign intelligence black markets.',
  targetsSummary: 'Targets: Ambassador Julian Croft & "The Ghost" (Rogue Hitman)',
  mapWidth: 1900,
  mapHeight: 1200,
  playerStart: { x: 120, y: 1100 },
  extractionPoint: { x: 1720, y: 150 },
  extractionRadius: 65,
  walls: [
    // Outer perimeter
    { x: 40, y: 40, w: 1820, h: 20, type: 'wall' },
    { x: 40, y: 1140, w: 1820, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1120, type: 'wall' },
    { x: 1840, y: 40, w: 20, h: 1120, type: 'wall' },

    // Garden Hedge Maze (Bottom-Left & Center)
    { x: 180, y: 780, w: 260, h: 40, type: 'cover' },
    { x: 180, y: 580, w: 260, h: 40, type: 'cover' },
    { x: 180, y: 380, w: 260, h: 40, type: 'cover' },
    { x: 480, y: 640, w: 40, h: 280, type: 'cover' },
    { x: 620, y: 420, w: 40, h: 320, type: 'cover' },

    // Grand Courtyard Fountain
    { x: 480, y: 220, w: 120, h: 120, type: 'cover' },

    // Villa Main Mansion (Right Half)
    // Reception & Gallery
    ...makeRoom(860, 60, 540, 480, 18, 'bottom', 220, 100),
    { x: 1040, y: 220, w: 180, h: 80, type: 'cover' },

    // Ambassador Croft's Private Study (Top-Right)
    ...makeRoom(1420, 60, 400, 440, 16, 'left', 160, 90),
    { x: 1540, y: 180, w: 140, h: 60, type: 'cover' },

    // Wine Cellar Vault & Archives (Bottom-Right)
    ...makeRoom(940, 680, 840, 440, 16, 'top', 240, 100),
    // Wine barrel rows
    { x: 1080, y: 780, w: 180, h: 50, type: 'cover' },
    { x: 1080, y: 920, w: 180, h: 50, type: 'cover' },
    { x: 1440, y: 780, w: 180, h: 50, type: 'cover' },
    { x: 1440, y: 920, w: 180, h: 50, type: 'cover' },
  ],
  lockers: [
    { x: 480, y: 960, w: 50, h: 30, occupied: false, label: 'Garden Shed' },
    { x: 740, y: 220, w: 50, h: 30, occupied: false, label: 'Statue Niche' },
    { x: 1340, y: 560, w: 50, h: 30, occupied: false, label: 'Antique Wardrobe' },
    { x: 1720, y: 720, w: 50, h: 30, occupied: false, label: 'Wine Cask' },
  ],
  guards: [
    // Garden Patrol
    {
      x: 320,
      y: 920,
      angle: 0,
      speed: 1.2,
      isTarget: false,
      name: 'Grounds Sentry',
      role: 'guard',
      suitColor: '#164e63',
      patrolPoints: [
        { x: 160, y: 920 },
        { x: 440, y: 920 },
        { x: 440, y: 720 },
        { x: 160, y: 720 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    // Courtyard Sentry
    {
      x: 720,
      y: 380,
      angle: Math.PI / 2,
      speed: 1.25,
      isTarget: false,
      name: 'Fountain Guard',
      role: 'heavy',
      suitColor: '#0e7490',
      patrolPoints: [
        { x: 720, y: 160 },
        { x: 720, y: 640 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    // TARGET 2: "The Ghost" (Rogue Hitman) - roaming the maze & villa
    {
      x: 640,
      y: 780,
      angle: -Math.PI / 2,
      speed: 1.4, // Fast and deadly
      isTarget: true,
      name: '"The Ghost" (Rogue Assassin)',
      role: 'heavy',
      suitColor: '#dc2626',
      patrolPoints: [
        { x: 640, y: 780 },
        { x: 860, y: 780 },
        { x: 860, y: 580 },
        { x: 640, y: 580 },
      ],
      currentPatrolIndex: 0,
      fov: (85 * Math.PI) / 180,
      viewDistance: 320,
    },
    // Gallery Bodyguard
    {
      x: 1140,
      y: 420,
      angle: Math.PI / 2,
      speed: 1.1,
      isTarget: false,
      name: 'Mansion Enforcer',
      role: 'heavy',
      suitColor: '#164e63',
      patrolPoints: [
        { x: 960, y: 420 },
        { x: 1320, y: 420 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 300,
    },
    // TARGET 1: Ambassador Julian Croft (in Study & Balcony)
    {
      x: 1600,
      y: 280,
      angle: 0,
      speed: 0.8,
      isTarget: true,
      name: 'Julian Croft (Ambassador)',
      role: 'vip',
      suitColor: '#e11d48',
      patrolPoints: [
        { x: 1600, y: 280 },
        { x: 1460, y: 280 },
        { x: 1460, y: 140 },
        { x: 1760, y: 140 },
        { x: 1760, y: 380 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    // Wine Cellar Guard
    {
      x: 1320,
      y: 840,
      angle: 0,
      speed: 1.1,
      isTarget: false,
      name: 'Cellar Watchman',
      role: 'guard',
      suitColor: '#164e63',
      patrolPoints: [
        { x: 1040, y: 840 },
        { x: 1540, y: 840 },
        { x: 1540, y: 1040 },
        { x: 1040, y: 1040 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
  ],
  cameras: [
    {
      id: 'cam-courtyard',
      name: 'Courtyard Gates CCTV',
      x: 820,
      y: 80,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.4,
      sweepSpeed: 0.7,
      viewDistance: 280,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-gallery',
      name: 'Grand Gallery CCTV',
      x: 1380,
      y: 80,
      baseAngle: Math.PI / 2,
      angle: Math.PI / 2,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.65,
      viewDistance: 280,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-dock',
      name: 'Lake Dock Pier CCTV',
      x: 1680,
      y: 480,
      baseAngle: -Math.PI / 2,
      angle: -Math.PI / 2,
      sweepAngle: Math.PI / 2.5,
      sweepSpeed: 0.6,
      viewDistance: 290,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 06: SUBTERRANEAN BIOLAB (2 Targets: Dr. Hannelore Weiss & Commander Jax)
// -----------------------------------------------------------------------------------------
const level6: LevelConfig = {
  id: 'biolab',
  title: 'CONTRACT 06: SUBTERRANEAN BIOLAB',
  subtitle: 'Project Chimera · Sub-Level 4 Cleanroom',
  briefing:
    'A rogue biotech consortium is manufacturing prohibited neural toxins in a subterranean complex. Eliminate Chief Scientist Dr. Hannelore Weiss and Enforcer Commander Jax. Decontaminate through the emergency ventilation tube.',
  targetName: 'Dr. Hannelore Weiss',
  targetBio: 'Architect of Project Chimera neural weapons. Conducts rounds in the cryogenic cleanroom.',
  targetsSummary: 'Targets: Dr. Hannelore Weiss (Chief Scientist) & Commander Jax (Cyber Enforcer)',
  mapWidth: 1900,
  mapHeight: 1300,
  playerStart: { x: 120, y: 1180 },
  extractionPoint: { x: 1780, y: 140 },
  extractionRadius: 60,
  walls: [
    // Outer boundary
    { x: 40, y: 40, w: 1820, h: 20, type: 'wall' },
    { x: 40, y: 1240, w: 1820, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1220, type: 'wall' },
    { x: 1840, y: 40, w: 20, h: 1220, type: 'wall' },

    // Airlock / Entrance chamber (Bottom-Left)
    ...makeRoom(40, 960, 420, 280, 16, 'top', 160, 90),

    // Specimen Containment Hub (Left-Center)
    ...makeRoom(40, 520, 380, 380, 16, 'right', 140, 90),
    { x: 140, y: 640, w: 80, h: 140, type: 'cover' },

    // Cryo Cleanroom / Bioreactor Hall (Center)
    { x: 500, y: 440, w: 20, h: 320, type: 'wall' },
    { x: 500, y: 880, w: 20, h: 360, type: 'wall' },
    { x: 980, y: 440, w: 20, h: 340, type: 'wall' },
    { x: 980, y: 900, w: 20, h: 340, type: 'wall' },
    // Bioreactor cylinder cover pillars
    { x: 680, y: 600, w: 120, h: 120, type: 'cover' },
    { x: 680, y: 860, w: 120, h: 120, type: 'cover' },

    // Mainframe Server Core (Top-Right)
    ...makeRoom(1100, 60, 640, 480, 16, 'bottom', 260, 110),
    { x: 1240, y: 180, w: 160, h: 70, type: 'cover' },
    { x: 1500, y: 180, w: 160, h: 70, type: 'cover' },
    { x: 1360, y: 340, w: 180, h: 80, type: 'cover' },

    // Chemical Synthesis Lab (Bottom-Right)
    ...makeRoom(1080, 700, 660, 540, 16, 'left', 180, 100),
    { x: 1260, y: 840, w: 260, h: 60, type: 'cover' },
    { x: 1260, y: 1020, w: 260, h: 60, type: 'cover' },
  ],
  lockers: [
    { x: 380, y: 990, w: 50, h: 30, occupied: false, label: 'Biohazard Bin' },
    { x: 80, y: 550, w: 50, h: 30, occupied: false, label: 'Cryo Stash' },
    { x: 1020, y: 470, w: 50, h: 30, occupied: false, label: 'Decon Locker' },
    { x: 1720, y: 560, w: 50, h: 30, occupied: false, label: 'Hazmat Wardrobe' },
  ],
  guards: [
    // Entrance Lab Patrol
    {
      x: 320,
      y: 1060,
      angle: -Math.PI / 2,
      speed: 1.1,
      isTarget: false,
      name: 'Airlock Sentry',
      role: 'guard',
      suitColor: '#0e7490',
      patrolPoints: [
        { x: 160, y: 1060 },
        { x: 380, y: 1060 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    // TARGET 1: Dr. Hannelore Weiss (Chief Scientist)
    {
      x: 740,
      y: 740,
      angle: 0,
      speed: 0.85,
      isTarget: true,
      name: 'Dr. Hannelore Weiss (Chief Scientist)',
      role: 'vip',
      suitColor: '#ec4899', // Bright Hot Pink / Crimson Lab Attire
      patrolPoints: [
        { x: 740, y: 540 },
        { x: 880, y: 540 },
        { x: 880, y: 980 },
        { x: 620, y: 980 },
        { x: 620, y: 740 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    // Biocore Heavy Guard
    {
      x: 580,
      y: 740,
      angle: Math.PI / 2,
      speed: 1.15,
      isTarget: false,
      name: 'Bio-Reactor Guard',
      role: 'heavy',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 560, y: 520 },
        { x: 920, y: 520 },
        { x: 920, y: 1020 },
        { x: 560, y: 1020 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 310,
    },
    // TARGET 2: Commander Jax (Cybernetic Enforcer Boss)
    {
      x: 1380,
      y: 280,
      angle: Math.PI,
      speed: 1.3,
      isTarget: true,
      name: 'Commander Jax (Cyber Enforcer)',
      role: 'heavy',
      suitColor: '#dc2626', // Combat Red cybernetic exo-suit
      patrolPoints: [
        { x: 1380, y: 280 },
        { x: 1620, y: 280 },
        { x: 1620, y: 440 },
        { x: 1200, y: 440 },
        { x: 1200, y: 180 },
      ],
      currentPatrolIndex: 0,
      fov: (85 * Math.PI) / 180,
      viewDistance: 330,
    },
    // Server Matrix Operator
    {
      x: 1540,
      y: 380,
      angle: -Math.PI / 2,
      speed: 0.95,
      isTarget: false,
      name: 'Mainframe Tech',
      role: 'civilian',
      suitColor: '#0284c7',
      patrolPoints: [
        { x: 1300, y: 380 },
        { x: 1620, y: 380 },
      ],
      currentPatrolIndex: 0,
      fov: (60 * Math.PI) / 180,
      viewDistance: 220,
    },
    // Chemical Synthesis Guard
    {
      x: 1380,
      y: 920,
      angle: 0,
      speed: 1.2,
      isTarget: false,
      name: 'Synthesis Watchman',
      role: 'guard',
      suitColor: '#155e75',
      patrolPoints: [
        { x: 1140, y: 920 },
        { x: 1640, y: 920 },
        { x: 1640, y: 1120 },
        { x: 1140, y: 1120 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
  ],
  cameras: [
    {
      id: 'cam-biocore',
      name: 'Bioreactor Core Laser CCTV',
      x: 540,
      y: 460,
      baseAngle: Math.PI / 4,
      angle: Math.PI / 4,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.7,
      viewDistance: 310,
      fov: (50 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-servervault',
      name: 'Server Vault Matrix CCTV',
      x: 1120,
      y: 80,
      baseAngle: Math.PI / 3,
      angle: Math.PI / 3,
      sweepAngle: Math.PI / 2.4,
      sweepSpeed: 0.65,
      viewDistance: 290,
      fov: (46 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-synthlab',
      name: 'Chemical Synthesis Bay CCTV',
      x: 1100,
      y: 720,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.3,
      sweepSpeed: 0.6,
      viewDistance: 280,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

// -----------------------------------------------------------------------------------------
// CONTRACT 07: THE EMBASSY GALA (2 Targets: Ambassador Mikhail Vane & Ksenia Rostova)
// -----------------------------------------------------------------------------------------
const level7: LevelConfig = {
  id: 'embassy',
  title: 'CONTRACT 07: THE EMBASSY GALA',
  subtitle: 'Consulate General · Grand Ballroom & State Archives',
  briefing:
    'Targets are traitor diplomat Ambassador Mikhail Vane and shadow broker Ksenia Rostova. They are exchanging classified defense blueprints during the annual diplomatic gala. Infiltrate, eliminate both targets silently, and escape through the embassy terrace garden.',
  targetName: 'Ambassador Mikhail Vane',
  targetBio: 'Consulate Ambassador trading state secrets to private military cartels.',
  targetsSummary: 'Targets: Ambassador Mikhail Vane (Diplomat) & Ksenia Rostova (Broker)',
  mapWidth: 2000,
  mapHeight: 1400,
  playerStart: { x: 120, y: 1260 },
  extractionPoint: { x: 1880, y: 160 },
  extractionRadius: 65,
  walls: [
    // Outer perimeter
    { x: 40, y: 40, w: 1920, h: 20, type: 'wall' },
    { x: 40, y: 1340, w: 1920, h: 20, type: 'wall' },
    { x: 40, y: 40, w: 20, h: 1320, type: 'wall' },
    { x: 1940, y: 40, w: 20, h: 1320, type: 'wall' },

    // Grand Entrance Hall & Vestibule (Bottom-Left)
    ...makeRoom(40, 1020, 460, 320, 16, 'top', 180, 100),

    // Diplomatic Archives & Security Hub (Left-Center)
    ...makeRoom(40, 520, 420, 440, 16, 'right', 160, 100),
    { x: 160, y: 640, w: 180, h: 60, type: 'cover' },
    { x: 160, y: 800, w: 180, h: 60, type: 'cover' },

    // Grand Ballroom & Chandelier Galleria (Center)
    { x: 560, y: 480, w: 20, h: 360, type: 'wall' },
    { x: 560, y: 960, w: 20, h: 380, type: 'wall' },
    { x: 1120, y: 480, w: 20, h: 360, type: 'wall' },
    { x: 1120, y: 960, w: 20, h: 380, type: 'wall' },
    // Ballroom marble statues / pillars
    { x: 740, y: 620, w: 60, h: 60, type: 'cover' },
    { x: 940, y: 620, w: 60, h: 60, type: 'cover' },
    { x: 740, y: 880, w: 60, h: 60, type: 'cover' },
    { x: 940, y: 880, w: 60, h: 60, type: 'cover' },

    // Ambassador Private Study & Terrace Suite (Top-Right)
    ...makeRoom(1220, 60, 680, 500, 16, 'bottom', 260, 120),
    { x: 1380, y: 180, w: 180, h: 70, type: 'cover' },
    { x: 1640, y: 180, w: 160, h: 70, type: 'cover' },
    { x: 1480, y: 360, w: 200, h: 80, type: 'cover' },

    // Banquet Dining Pavilion (Bottom-Right)
    ...makeRoom(1200, 740, 720, 600, 16, 'left', 200, 110),
    { x: 1380, y: 900, w: 320, h: 80, type: 'cover' },
    { x: 1380, y: 1080, w: 320, h: 80, type: 'cover' },
  ],
  lockers: [
    { x: 420, y: 1050, w: 50, h: 30, occupied: false, label: 'Coat Closet' },
    { x: 80, y: 550, w: 50, h: 30, occupied: false, label: 'Archive Cabinet' },
    { x: 1160, y: 500, w: 50, h: 30, occupied: false, label: 'Linen Wardrobe' },
    { x: 1840, y: 580, w: 50, h: 30, occupied: false, label: 'Garden Shed' },
  ],
  guards: [
    // Entrance Dignitary Guard
    {
      x: 340,
      y: 1140,
      angle: -Math.PI / 2,
      speed: 1.1,
      isTarget: false,
      name: 'Vestibule Guard',
      role: 'guard',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 180, y: 1140 },
        { x: 420, y: 1140 },
      ],
      currentPatrolIndex: 0,
      fov: (70 * Math.PI) / 180,
      viewDistance: 270,
    },
    // TARGET 2: Ksenia Rostova (Black Market Courier)
    {
      x: 840,
      y: 750,
      angle: 0,
      speed: 0.9,
      isTarget: true,
      name: 'Ksenia Rostova (Shadow Broker)',
      role: 'vip',
      suitColor: '#be123c', // Crimson evening gown
      patrolPoints: [
        { x: 840, y: 750 },
        { x: 1020, y: 750 },
        { x: 1020, y: 1020 },
        { x: 680, y: 1020 },
        { x: 680, y: 580 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    // Ballroom Sentry
    {
      x: 640,
      y: 760,
      angle: Math.PI / 2,
      speed: 1.1,
      isTarget: false,
      name: 'Ballroom Enforcer',
      role: 'heavy',
      suitColor: '#0f172a',
      patrolPoints: [
        { x: 620, y: 560 },
        { x: 1060, y: 560 },
        { x: 1060, y: 1100 },
        { x: 620, y: 1100 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 290,
    },
    // TARGET 1: Ambassador Mikhail Vane
    {
      x: 1540,
      y: 280,
      angle: Math.PI / 2,
      speed: 0.8,
      isTarget: true,
      name: 'Ambassador Mikhail Vane',
      role: 'vip',
      suitColor: '#dc2626', // Red diplomat sash & tuxedo
      patrolPoints: [
        { x: 1540, y: 280 },
        { x: 1720, y: 280 },
        { x: 1720, y: 460 },
        { x: 1340, y: 460 },
        { x: 1340, y: 160 },
      ],
      currentPatrolIndex: 0,
      fov: (65 * Math.PI) / 180,
      viewDistance: 240,
    },
    // Study Private Bodyguard
    {
      x: 1420,
      y: 340,
      angle: -Math.PI / 2,
      speed: 1.25,
      isTarget: false,
      name: 'Ambassador Bodyguard',
      role: 'heavy',
      suitColor: '#1e293b',
      patrolPoints: [
        { x: 1320, y: 340 },
        { x: 1760, y: 340 },
      ],
      currentPatrolIndex: 0,
      fov: (80 * Math.PI) / 180,
      viewDistance: 300,
    },
    // Banquet Hall Guard
    {
      x: 1460,
      y: 980,
      angle: 0,
      speed: 1.15,
      isTarget: false,
      name: 'Banquet Guard',
      role: 'guard',
      suitColor: '#164e63',
      patrolPoints: [
        { x: 1260, y: 980 },
        { x: 1780, y: 980 },
        { x: 1780, y: 1200 },
        { x: 1260, y: 1200 },
      ],
      currentPatrolIndex: 0,
      fov: (75 * Math.PI) / 180,
      viewDistance: 280,
    },
  ],
  cameras: [
    {
      id: 'cam-ballroom',
      name: 'Ballroom Chandelier CCTV',
      x: 600,
      y: 500,
      baseAngle: Math.PI / 4,
      angle: Math.PI / 4,
      sweepAngle: Math.PI / 2.2,
      sweepSpeed: 0.65,
      viewDistance: 300,
      fov: (50 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-study',
      name: 'Ambassador Study CCTV',
      x: 1240,
      y: 80,
      baseAngle: Math.PI / 3,
      angle: Math.PI / 3,
      sweepAngle: Math.PI / 2.4,
      sweepSpeed: 0.6,
      viewDistance: 280,
      fov: (45 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
    {
      id: 'cam-terrace',
      name: 'Garden Terrace Exfil CCTV',
      x: 1760,
      y: 80,
      baseAngle: (3 * Math.PI) / 4,
      angle: (3 * Math.PI) / 4,
      sweepAngle: Math.PI / 2.3,
      sweepSpeed: 0.7,
      viewDistance: 290,
      fov: (48 * Math.PI) / 180,
      suspicionMeter: 0,
      disabled: false,
    },
  ],
};

export const LEVELS: LevelConfig[] = [level1, level2, level3, level4, level5, level6, level7];
