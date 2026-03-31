/**
 * RNK™ Illumination - Targeting Lines
 */

import { AVAILABLE_SYMBOLS, DEFAULT_SETTINGS, IMAGE_URL_RE, MODULE_ID } from './constants.js';
import { drawSymbol } from './targeting.js';

const _targetingLines = new Map();
let _getUserToken = () => null;

export function configureTargetingLines({ getUserToken } = {}) {
  if (typeof getUserToken === 'function') {
    _getUserToken = getUserToken;
  }
}

function getTargetingLineGraphics(userId, targetId) {
  if (!_targetingLines.has(userId)) {
    _targetingLines.set(userId, new Map());
  }

  const userLines = _targetingLines.get(userId);
  if (!userLines.has(targetId)) {
    const graphics = new PIXI.Graphics();
    graphics.name = `rnk-targeting-${userId}-${targetId}`;
    canvas.controls.addChild(graphics);
    graphics.zIndex = 100;
    userLines.set(targetId, graphics);
  }

  return userLines.get(targetId);
}

function clearGraphics(graphics) {
  if (!graphics) return;
  while (graphics.children.length > 0) {
    graphics.children[0]?.destroy({ children: true });
  }
  graphics.clear();
  if (graphics.geometry) graphics.geometry.invalidate();
}

function destroyGraphics(graphics) {
  if (!graphics) return;
  clearGraphics(graphics);
  if (!graphics.destroyed) {
    graphics.destroy({ children: true });
  }
}

function addMarkerSymbol(graphics, symbol, x, y, colorValue) {
  if (typeof symbol !== 'string') symbol = DEFAULT_SETTINGS.symbol;

  if (AVAILABLE_SYMBOLS.includes(symbol)) {
    const marker = new PIXI.Graphics();
    drawSymbol(marker, symbol, 0, 0, 7, colorValue, 2);
    marker.position.set(x, y);
    graphics.addChild(marker);
    return;
  }

  if (IMAGE_URL_RE.test(symbol)) {
    const marker = PIXI.Sprite.from(symbol);
    marker.anchor.set(0.5, 0.5);
    marker.position.set(x, y);
    marker.width = 16;
    marker.height = 16;
    try { marker.tint = colorValue; } catch (err) { /* ignore */ }
    graphics.addChild(marker);
    return;
  }

  const fallback = new PIXI.Graphics();
  drawSymbol(fallback, DEFAULT_SETTINGS.symbol, 0, 0, 7, colorValue, 2);
  fallback.position.set(x, y);
  graphics.addChild(fallback);
}

export function drawTargetingLine(user, targetToken, color, symbol = DEFAULT_SETTINGS.symbol) {
  if (!user || !targetToken || !canvas?.ready) return;

  const userToken = _getUserToken(user);
  if (!userToken) return;

  const userId = user.id;
  const targetId = targetToken.id;
  const graphics = getTargetingLineGraphics(userId, targetId);

  try {
    clearGraphics(graphics);
  } catch (err) {
    console.error('RNK™ Illumination | Error clearing targeting line graphics:', err);
  }

  const startX = userToken.center.x;
  const startY = userToken.center.y;
  const endX = targetToken.center.x;
  const endY = targetToken.center.y;

  const dx = endX - startX;
  const dy = endY - startY;
  const totalLength = Math.sqrt(dx * dx + dy * dy);
  if (!totalLength) return;

  const colorValue = Color.from(color).valueOf();
  const gridDistance = totalLength / canvas.grid.size;
  const unitDistance = gridDistance * (canvas.scene.grid.distance || 5);
  const units = canvas.scene.grid.units || 'ft';

  graphics.lineStyle(4, colorValue, 1);
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);

  const markerInterval = 5;
  const numMarkers = Math.floor(unitDistance / markerInterval);
  const unitVectorX = dx / totalLength;
  const unitVectorY = dy / totalLength;

  for (let i = 1; i <= numMarkers; i++) {
    const distance = i * markerInterval;
    const pixelDist = (distance / (canvas.scene.grid.distance || 5)) * canvas.grid.size;
    const markerX = startX + unitVectorX * pixelDist;
    const markerY = startY + unitVectorY * pixelDist;

    addMarkerSymbol(graphics, symbol, markerX, markerY, colorValue);

    const text = new PIXI.Text(`${distance}${units}`, {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xFFFFFF,
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 3
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(markerX, markerY - 15);
    graphics.addChild(text);
  }

  const angle = Math.atan2(dy, dx);
  const arrowLength = 15;
  const arrowAngle = Math.PI / 6;

  graphics.lineStyle(0);
  graphics.beginFill(colorValue, 1);
  graphics.moveTo(endX, endY);
  graphics.lineTo(
    endX - arrowLength * Math.cos(angle - arrowAngle),
    endY - arrowLength * Math.sin(angle - arrowAngle)
  );
  graphics.lineTo(
    endX - arrowLength * Math.cos(angle + arrowAngle),
    endY - arrowLength * Math.sin(angle + arrowAngle)
  );
  graphics.lineTo(endX, endY);
  graphics.endFill();

  if (graphics.geometry) graphics.geometry.invalidate();
}

export function removeTargetingLine(user, targetToken) {
  if (!user || !targetToken) return;
  const userId = user.id;
  const targetId = targetToken.id;

  if (!_targetingLines.has(userId)) return;

  const userLines = _targetingLines.get(userId);
  if (!userLines.has(targetId)) return;

  const graphics = userLines.get(targetId);
  try {
    destroyGraphics(graphics);
  } catch (err) {
    console.error('RNK™ Illumination | Error removing targeting line:', err);
  }

  userLines.delete(targetId);
  if (userLines.size === 0) {
    _targetingLines.delete(userId);
  }
}

export function updateTokenTargetingLines(token) {
  if (!token || !canvas?.ready) return;

  game.users.forEach(user => {
    const userToken = _getUserToken(user);
    if (userToken === token) {
      user.targets.forEach(target => {
        const settings = user.getFlag(MODULE_ID, 'settings') || DEFAULT_SETTINGS;
        drawTargetingLine(user, target, settings.color, settings.symbol);
      });
    }
  });

  game.users.forEach(user => {
    if (user.targets.has(token)) {
      const settings = user.getFlag(MODULE_ID, 'settings') || DEFAULT_SETTINGS;
      drawTargetingLine(user, token, settings.color, settings.symbol);
    }
  });
}

export function clearTargetingLinesForToken(token) {
  if (!token) return;
  const tokenId = token.id;

  _targetingLines.forEach((userLines, userId) => {
    if (userLines.has(tokenId)) {
      try {
        destroyGraphics(userLines.get(tokenId));
      } catch (err) { /* ignore */ }
      userLines.delete(tokenId);
    }
    if (userLines.size === 0) _targetingLines.delete(userId);
  });

  game.users.forEach(user => {
    const userToken = _getUserToken(user);
    if (userToken === token && _targetingLines.has(user.id)) {
      const userLines = _targetingLines.get(user.id);
      userLines.forEach(graphics => {
        try {
          destroyGraphics(graphics);
        } catch (err) { /* ignore */ }
      });
      _targetingLines.delete(user.id);
    }
  });
}

export function clearTargetingLines() {
  _targetingLines.forEach(userLines => {
    userLines.forEach(graphics => {
      try {
        destroyGraphics(graphics);
      } catch (err) { /* ignore */ }
    });
  });
  _targetingLines.clear();
}