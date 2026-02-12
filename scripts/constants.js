/**
 * RNK™ Illumination - Constants
 */

export const DEFAULT_SETTINGS = { color: '#ffffff', effect: 'glow', symbol: 'x', intensity: 1.0, range: 30 };
export const AVAILABLE_EFFECTS = ['none', 'glow', 'outline', 'shadow', 'neon'];
export const AVAILABLE_SYMBOLS = ['x', 'plus', 'cross', 'triangle', 'square', 'circle', 'star', 'diamond', 'arrow', 'dot', 'ring', 'hexagon'];
export const AVAILABLE_RANGES = [15, 20, 25, 30, 40, 50, 60];
export const IMAGE_URL_RE = /(?:\.png|\.jpe?g|\.webp|\.svg)(?:\?.*)?$/i;
export const MODULE_ID = 'rnk-illumination';
