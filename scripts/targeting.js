/**
 * RNK™ Illumination - Targeting Indicators
 */

import { AVAILABLE_SYMBOLS, DEFAULT_SETTINGS, IMAGE_URL_RE } from './constants.js';

// Targeting indicator storage
const _targetingIndicators = new Map();

/**
 * Ensure targeting overlay container exists on token
 * @param {Token} token - The token to ensure container for
 * @returns {PIXI.Container} The overlay container
 */
export function ensureTargetingContainer(token) {
  if (token.targetingContainer && !token.targetingContainer.destroyed) {
    if (token.targetingContainer.parent !== token) {
      try {
        token.targetingContainer.parent?.removeChild(token.targetingContainer);
      } catch (err) { /* ignore */ }
      token.addChild(token.targetingContainer);
      token.targetingContainer.zIndex = 5000;
      token.targetingContainer.x = 0;
      token.targetingContainer.y = 0;
    }
    return token.targetingContainer;
  }

  const container = new PIXI.Container();
  container.name = 'rnk-illumination-targeting-overlay';
  container.sortableChildren = true;
  container.x = 0;
  container.y = 0;
  container.zIndex = 5000;

  if (typeof token.sortableChildren === 'boolean') {
    token.sortableChildren = true;
  }

  token.addChild(container);
  token.targetingContainer = container;
  return container;
}

/**
 * Draw a symbol on the graphics object
 * @param {PIXI.Graphics} graphics - The graphics to draw on
 * @param {string} symbol - The symbol type
 * @param {number} x - Center x
 * @param {number} y - Center y
 * @param {number} size - Size of the symbol
 * @param {number} color - Color
 * @param {number} lineWidth - Line width
 */
export function drawSymbol(graphics, symbol, x, y, size, color, lineWidth) {
  graphics.lineStyle(lineWidth, color, 1, 0.5, true);
  switch (symbol) {
    case 'x':
      graphics.moveTo(x - size, y - size);
      graphics.lineTo(x + size, y + size);
      graphics.moveTo(x + size, y - size);
      graphics.lineTo(x - size, y + size);
      break;
    case 'plus':
      graphics.moveTo(x, y - size);
      graphics.lineTo(x, y + size);
      graphics.moveTo(x - size, y);
      graphics.lineTo(x + size, y);
      break;
    case 'cross':
      graphics.moveTo(x - size, y - size * 0.5);
      graphics.lineTo(x + size, y + size * 0.5);
      graphics.moveTo(x + size, y - size * 0.5);
      graphics.lineTo(x - size, y + size * 0.5);
      break;
    case 'triangle':
      graphics.moveTo(x, y - size);
      graphics.lineTo(x - size * 0.866, y + size * 0.5);
      graphics.lineTo(x + size * 0.866, y + size * 0.5);
      graphics.lineTo(x, y - size);
      break;
    case 'square':
      graphics.drawRect(x - size, y - size, size * 2, size * 2);
      break;
    case 'circle':
      graphics.drawCircle(x, y, size);
      break;
    case 'star':
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? size : size * 0.5;
        points.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      graphics.drawPolygon(points);
      break;
    case 'diamond':
      graphics.moveTo(x, y - size);
      graphics.lineTo(x + size, y);
      graphics.lineTo(x, y + size);
      graphics.lineTo(x - size, y);
      graphics.lineTo(x, y - size);
      break;
    case 'arrow':
      graphics.moveTo(x, y - size);
      graphics.lineTo(x + size * 0.5, y);
      graphics.lineTo(x + size * 0.2, y);
      graphics.lineTo(x + size * 0.2, y + size);
      graphics.lineTo(x - size * 0.2, y + size);
      graphics.lineTo(x - size * 0.2, y);
      graphics.lineTo(x - size * 0.5, y);
      graphics.lineTo(x, y - size);
      break;
    case 'dot':
      graphics.drawCircle(x, y, size * 0.3);
      break;
    case 'ring':
      graphics.drawCircle(x, y, size);
      graphics.drawCircle(x, y, size * 0.7);
      break;
    case 'hexagon':
      const hexPoints = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        hexPoints.push(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      }
      graphics.drawPolygon(hexPoints);
      break;
    default:
      graphics.moveTo(x - size, y - size);
      graphics.lineTo(x + size, y + size);
      graphics.moveTo(x + size, y - size);
      graphics.lineTo(x - size, y + size);
  }
}

/**
 * Create a targeting indicator for a token
 * @param {Token} token - The targeted token
 * @param {string} color - The color for the indicator
 * @param {string} symbol - The symbol to display
 * @returns {PIXI.Container} The indicator container
 */
export function createTargetingIndicator(token, color, symbol) {
  const container = ensureTargetingContainer(token);
  const indicatorId = 'targeting-indicator';
  const existing = container.getChildByName(indicatorId);
  if (existing) {
    try { container.removeChild(existing).destroy({ children: true }); } catch (err) { /* ignore */ }
  }

  const effectContainer = new PIXI.Container();
  effectContainer.name = indicatorId;
  effectContainer.sortableChildren = true;
  effectContainer.zIndex = 50;
  effectContainer.x = token.w / 2;
  effectContainer.y = token.h / 2;

  const overlayColor = (() => {
    try { return PIXI.utils.string2hex(color); } catch (err) { return 0xFF0000; }
  })();

  const radius = Math.min(token.w, token.h) / 2 - 2;
  const borderWidth = Math.max(2, Math.round(Math.min(token.w, token.h) * 0.05));

  const background = new PIXI.Graphics();
  background.zIndex = 5;
  background.alpha = 0.3;
  background.beginFill(overlayColor, 1);
  background.drawCircle(0, 0, radius);
  background.endFill();
  effectContainer.addChild(background);

  const border = new PIXI.Graphics();
  border.zIndex = 10;
  border.lineStyle(borderWidth, overlayColor, 0.8, 0.5, true);
  border.drawCircle(0, 0, radius);
  effectContainer.addChild(border);

  if (AVAILABLE_SYMBOLS.includes(symbol)) {
    const symbolGraphics = new PIXI.Graphics();
    symbolGraphics.zIndex = 15;
    drawSymbol(symbolGraphics, symbol, 0, 0, radius * 0.6, overlayColor, Math.max(2, Math.round(Math.min(token.w, token.h) * 0.03)));
    effectContainer.addChild(symbolGraphics);
  } else {
    try {
      const sprite = PIXI.Sprite.from(symbol);
      sprite.zIndex = 15;
      sprite.anchor.set(0.5, 0.5);
      try { sprite.tint = overlayColor; } catch (e) { /* ignore */ }
      const size = radius * 1.2;
      sprite.width = size * 2;
      sprite.height = size * 2;
      effectContainer.addChild(sprite);
    } catch (err) {
      const fallback = new PIXI.Graphics();
      fallback.zIndex = 15;
      drawSymbol(fallback, 'x', 0, 0, radius * 0.6, overlayColor, Math.max(2, Math.round(Math.min(token.w, token.h) * 0.03)));
      effectContainer.addChild(fallback);
    }
  }

  container.addChild(effectContainer);
  container.visible = true;
  return effectContainer;
}

/**
 * Show targeting indicator for a token
 * @param {Token} token - The token to show indicator for
 * @param {string} color - The color for the indicator
 * @param {string} symbol - The symbol to display
 */
export function showTargetingIndicator(token, color, symbol) {
  if (!token) return;
  try {
    const indicator = createTargetingIndicator(token, color, symbol);
    _targetingIndicators.set(token.id, indicator);
  } catch (err) {
    console.error('RNK™ Illumination | Failed to show targeting indicator:', err);
  }
}

/**
 * Hide targeting indicator for a token
 * @param {Token} token - The token to hide indicator for
 */
export function hideTargetingIndicator(token) {
  if (!token) return;
  try {
    const container = token.targetingContainer;
    if (container && !container.destroyed) {
      const indicator = container.getChildByName('targeting-indicator');
      if (indicator) {
        container.removeChild(indicator).destroy({ children: true });
      }
    }
    _targetingIndicators.delete(token.id);
  } catch (err) {
    console.error('RNK™ Illumination | Failed to hide targeting indicator:', err);
  }
}

/**
 * Sanitize symbol selection
 * @param {string} symbol
 * @returns {string}
 */
export function sanitizeSymbol(symbol) {
  if (typeof symbol === 'string' && AVAILABLE_SYMBOLS.includes(symbol)) return symbol;
  if (typeof symbol === 'string' && IMAGE_URL_RE.test(symbol)) return symbol;
  return DEFAULT_SETTINGS.symbol;
}

/**
 * Validate symbol selection (preset or image URL/path)
 * @param {string} symbol
 * @returns {boolean}
 */
export function isValidSymbol(symbol) {
  if (typeof symbol !== 'string') return false;
  return AVAILABLE_SYMBOLS.includes(symbol) || IMAGE_URL_RE.test(symbol);
}

/**
 * Cleanup indicators map
 */
export function clearTargetingIndicators() {
  _targetingIndicators.clear();
}
