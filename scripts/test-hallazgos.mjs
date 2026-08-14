import assert from 'node:assert/strict';
import test from 'node:test';
import { getTotalUnlockedAchievements, resolveAchievementProgress } from '../lib/hallazgosLogic.js';

const levels = (items) => items.map(([level, target, name]) => ({ level, target, name }));
const time = { badges: levels([[1, 75, 'Primer salto'], [2, 100, 'Un siglo'], [3, 140, 'Otra época'], [4, 170, 'Ya es historia'], [5, 200, 'Dos siglos'], [6, 230, 'Viajero del tiempo'], [7, 250, 'Raíces ancestrales']]) };
const generations = { badges: levels([[1, 3, 'Primeras raíces'], [2, 4, 'Más allá'], [3, 5, 'Raíces profundas'], [4, 6, 'Otra época'], [5, 7, 'Linaje antiguo'], [6, 8, 'Modo arqueólogo']]) };
const complete = { badges: levels([[1, '2/2', 'Origen completo'], [2, '4/4', 'Cuatro raíces'], [3, '8/8', 'Ocho raíces'], [4, '16/16', 'Gran conquista'], [5, '32/32', 'Linaje excepcional'], [6, '64/64', 'Linaje legendario']]) };

test('viaje en el tiempo respeta el siguiente target', () => {
  const result = resolveAchievementProgress(time, 139);
  assert.equal(result.currentLevel.level, 2); assert.equal(result.nextLevel.name, 'Otra época'); assert.equal(result.nextTarget, 140);
  assert.equal(resolveAchievementProgress(time, 140).currentLevel.level, 3);
});

test('generaciones 7 llega a Linaje antiguo, no al nivel 6', () => {
  const result = resolveAchievementProgress(generations, 7);
  assert.equal(result.currentLevel.level, 5); assert.equal(result.currentLevel.name, 'Linaje antiguo'); assert.equal(result.nextLevel.name, 'Modo arqueólogo');
});

test('generaciones completas 16 llega a Gran conquista', () => {
  const result = resolveAchievementProgress(complete, 16);
  assert.equal(result.currentLevel.level, 4); assert.equal(result.currentLevel.name, 'Gran conquista'); assert.equal(result.nextTarget, 32);
});

test('contador global suma solo niveles alcanzados', () => {
  const values = [resolveAchievementProgress({ badges: levels([[1, 10, 'a'], [2, 25, 'b'], [3, 50, 'c']] ) }, 38), resolveAchievementProgress(generations, 7), resolveAchievementProgress(time, 139), resolveAchievementProgress(complete, 16), resolveAchievementProgress({ badges: levels([[1, 2, 'a'], [2, 3, 'b'], [3, 4, 'c'], [4, 5, 'd']]) }, 4)];
  assert.equal(getTotalUnlockedAchievements(values), 16);
});

test('último nivel muestra recorrido completado', () => {
  const result = resolveAchievementProgress(time, 300);
  assert.equal(result.isComplete, true); assert.equal(result.progress, 100); assert.equal(result.nextLevel, null);
});
