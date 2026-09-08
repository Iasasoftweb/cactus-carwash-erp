import type { PointOfSaleResponse } from '@cactus/shared';

const POS_PREFERENCE_PREFIX = 'cactus:preferred-pos';

function preferenceKey(userId: string): string {
  return `${POS_PREFERENCE_PREFIX}:${userId}`;
}

export function preferredPosId(userId: string): string | null {
  try {
    return window.localStorage.getItem(preferenceKey(userId));
  } catch {
    return null;
  }
}

export function resolvePreferredPos(
  points: PointOfSaleResponse[],
  userId: string,
): PointOfSaleResponse | null {
  if (points.length === 0) return null;

  const savedId = preferredPosId(userId);

  return (
    points.find((point) => point.id === savedId) ??
    points[0] ??
    null
  );
}

export function savePreferredPos(
  userId: string,
  pointOfSaleId: string,
): void {
  try {
    window.localStorage.setItem(
      preferenceKey(userId),
      pointOfSaleId,
    );
  } catch {
    // La preferencia es UX; la autorización real permanece en backend.
  }
}
