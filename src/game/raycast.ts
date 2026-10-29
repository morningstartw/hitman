import { Point, Wall } from './types';

// Check intersection between two line segments: p1->p2 and p3->p4
export function getLineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;
  const x3 = p3.x;
  const y3 = p3.y;
  const x4 = p4.x;
  const y4 = p4.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.000001) {
    return null; // Lines are parallel
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
    };
  }

  return null;
}

// Get segments that make up a wall rectangle
export function getWallSegments(wall: Wall): [Point, Point][] {
  const p1: Point = { x: wall.x, y: wall.y };
  const p2: Point = { x: wall.x + wall.w, y: wall.y };
  const p3: Point = { x: wall.x + wall.w, y: wall.y + wall.h };
  const p4: Point = { x: wall.x, y: wall.y + wall.h };

  return [
    [p1, p2],
    [p2, p3],
    [p3, p4],
    [p4, p1],
  ];
}

// Cast a single ray from origin in a direction up to maxDist
export function castRay(
  origin: Point,
  angle: number,
  maxDist: number,
  walls: Wall[]
): { point: Point; distance: number } {
  const dest: Point = {
    x: origin.x + Math.cos(angle) * maxDist,
    y: origin.y + Math.sin(angle) * maxDist,
  };

  let closestHit: Point = dest;
  let minDist = maxDist;

  for (const wall of walls) {
    // Quick AABB bounding check to reject far away walls
    if (
      Math.min(origin.x, dest.x) > wall.x + wall.w ||
      Math.max(origin.x, dest.x) < wall.x ||
      Math.min(origin.y, dest.y) > wall.y + wall.h ||
      Math.max(origin.y, dest.y) < wall.y
    ) {
      continue;
    }

    const segments = getWallSegments(wall);
    for (const [p1, p2] of segments) {
      const hit = getLineIntersection(origin, dest, p1, p2);
      if (hit) {
        const dx = hit.x - origin.x;
        const dy = hit.y - origin.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          minDist = dist;
          closestHit = hit;
        }
      }
    }
  }

  return { point: closestHit, distance: minDist };
}

// Check direct unobstructed line of sight between two points
export function hasLineOfSight(p1: Point, p2: Point, walls: Wall[]): boolean {
  for (const wall of walls) {
    // If wall is glass or low cover, it might have partial sight, but standard walls block completely
    if (wall.type === 'glass') continue;

    // AABB rejection
    if (
      Math.min(p1.x, p2.x) > wall.x + wall.w ||
      Math.max(p1.x, p2.x) < wall.x ||
      Math.min(p1.y, p2.y) > wall.y + wall.h ||
      Math.max(p1.y, p2.y) < wall.y
    ) {
      continue;
    }

    const segments = getWallSegments(wall);
    for (const [segA, segB] of segments) {
      if (getLineIntersection(p1, p2, segA, segB)) {
        return false;
      }
    }
  }
  return true;
}

// Generate the 2D vision polygon for a vision cone
export function calculateVisionPolygon(
  origin: Point,
  centerAngle: number,
  fov: number,
  maxDistance: number,
  walls: Wall[],
  numRays: number = 28
): Point[] {
  const points: Point[] = [origin];
  const halfFov = fov / 2;
  const startAngle = centerAngle - halfFov;
  const angleStep = fov / numRays;

  // Cast arc rays
  for (let i = 0; i <= numRays; i++) {
    const angle = startAngle + i * angleStep;
    const ray = castRay(origin, angle, maxDistance, walls);
    points.push(ray.point);
  }

  return points;
}

// Check if a point is within a vision cone AND has unobstructed line of sight
export function isPointInCone(
  origin: Point,
  centerAngle: number,
  fov: number,
  maxDistance: number,
  target: Point,
  walls: Wall[]
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distSq = dx * dx + dy * dy;

  if (distSq > maxDistance * maxDistance) {
    return false;
  }

  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - centerAngle;

  // Normalize angle to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (Math.abs(angleDiff) > fov / 2) {
    return false;
  }

  // Check if blocked by walls
  return hasLineOfSight(origin, target, walls);
}

// Circle against AABB rectangle resolution (for player/guards movement against walls)
export function resolveCircleRectCollision(
  circle: { x: number; y: number; radius: number },
  rect: Wall
): { x: number; y: number; collided: boolean } {
  // Find nearest point on rect to circle center
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  const distSq = dx * dx + dy * dy;

  if (distSq < circle.radius * circle.radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = circle.radius - dist;
    return {
      x: circle.x + (dx / dist) * overlap,
      y: circle.y + (dy / dist) * overlap,
      collided: true,
    };
  } else if (distSq === 0) {
    // Circle center inside rect
    return {
      x: circle.x,
      y: rect.y - circle.radius,
      collided: true,
    };
  }

  return { x: circle.x, y: circle.y, collided: false };
}
