export function targetValue(target) {
  if (typeof target === 'number') return target;
  const match = String(target).match(/(\d+)\s*\/\s*(\d+)/);
  return match ? Number(match[2]) : Number(target) || 0;
}

export function resolveAchievementProgress(category, currentValue) {
  const value = Number(currentValue) || 0;
  const levels = category.badges || category.levels || [];
  const unlockedLevels = levels.filter((level) => value >= targetValue(level.target));
  const currentLevel = unlockedLevels.at(-1) || null;
  const nextLevel = levels.find((level) => value < targetValue(level.target)) || null;
  const previousTarget = currentLevel ? targetValue(currentLevel.target) : 0;
  const nextTarget = nextLevel ? targetValue(nextLevel.target) : previousTarget;
  const progress = nextLevel ? Math.max(0, Math.min(100, Math.round(((value - previousTarget) / Math.max(1, nextTarget - previousTarget)) * 100))) : 100;
  return { currentValue: value, unlockedLevels, currentLevel, currentLevelNumber: currentLevel?.level || 0, nextLevel, nextTarget, progress, isComplete: !nextLevel, badgeState: (level) => value >= targetValue(level.target) ? 'active' : 'inactive' };
}

export function getTotalUnlockedAchievements(resolvedCategories) {
  return resolvedCategories.reduce((total, resolved) => total + resolved.unlockedLevels.length, 0);
}
