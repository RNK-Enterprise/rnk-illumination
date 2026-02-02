/**
 * RNK™ Illumination - Effects and Filters
 */

import { DEFAULT_SETTINGS } from './constants.js';

/**
 * Validate and convert color string to hex
 * @param {string} colorString - Color in hex format (#ffffff)
 * @returns {number} PIXI hex color value
 */
export function parseColor(colorString) {
  try {
    if (!colorString || typeof colorString !== 'string') {
      return Color.from(DEFAULT_SETTINGS.color).valueOf();
    }
    return Color.from(colorString).valueOf();
  } catch (e) {
    console.warn("RNK™ Illumination | Invalid color format:", colorString);
    return Color.from(DEFAULT_SETTINGS.color).valueOf();
  }
}

/**
 * Sanitize a color string to ensure it's a valid hex color
 * @param {string} color - The color to sanitize
 * @returns {string} - A valid hex color
 */
export function sanitizeColor(color) {
  if (typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color)) {
    return color;
  }
  return '#ffffff';
}

/**
 * Get the appropriate filter class based on availability
 * Foundry v12+ uses different filter locations
 */
export function getFilterClass(filterName) {
  if (globalThis.PIXI?.filters?.[filterName]) {
    return globalThis.PIXI.filters[filterName];
  }
  if (globalThis[filterName]) {
    return globalThis[filterName];
  }
  return null;
}

/**
 * Create a glow-like effect using ColorMatrixFilter as fallback
 * @param {number} color - Hex color value
 * @param {number} strength - Effect strength
 * @returns {PIXI.ColorMatrixFilter}
 */
export function createFallbackFilter(color, strength = 1) {
  const filter = new PIXI.ColorMatrixFilter();
  const c = Color.from(color);
  const rgb = c.rgb;

  filter.matrix = [
    1, 0, 0, 0, rgb[0] * strength * 0.3,
    0, 1, 0, 0, rgb[1] * strength * 0.3,
    0, 0, 1, 0, rgb[2] * strength * 0.3,
    0, 0, 0, 1, 0
  ];

  return filter;
}

/**
 * Apply illumination effect to a token
 * @param {Token} token - The token to apply effect to
 * @param {Object} settings - Settings with color and effect type
 * @param {boolean} [shouldPulsate=null] - Whether the effect should pulsate
 */
export function applyEffect(token, settings, shouldPulsate = null) {
  if (!token) return;
  const sprite = token.mesh || token.icon;
  if (!sprite) return;

  const pulsate = (shouldPulsate !== null) ? shouldPulsate : token.isTargeted;

  removeEffect(token);

  try {
    const color = parseColor(settings.color);
    let filter;

    const GlowFilter = getFilterClass('GlowFilter');
    const OutlineFilter = getFilterClass('OutlineFilter');
    const DropShadowFilter = getFilterClass('DropShadowFilter');

    switch (settings.effect) {
      case 'glow':
        if (GlowFilter) {
          filter = new GlowFilter({ distance: 10, outerStrength: 1.5, innerStrength: 0.5, color: color });
        } else {
          filter = createFallbackFilter(color, 1);
        }
        break;
      case 'outline':
        if (OutlineFilter) {
          filter = new OutlineFilter(1.5, color, 0.3);
        } else if (GlowFilter) {
          filter = new GlowFilter({ distance: 3, outerStrength: 3, innerStrength: 0, color: color });
        } else {
          filter = createFallbackFilter(color, 1.5);
        }
        break;
      case 'shadow':
        if (DropShadowFilter) {
          filter = new DropShadowFilter({ offset: { x: 3, y: 3 }, alpha: 0.6, color: color });
        } else {
          filter = createFallbackFilter(color, 0.5);
        }
        break;
      case 'neon':
        if (GlowFilter) {
          filter = new GlowFilter({ distance: 8, outerStrength: 2.5, innerStrength: 0.3, color: color });
        } else {
          filter = createFallbackFilter(color, 2);
        }
        break;
      default:
        if (GlowFilter) {
          filter = new GlowFilter({ distance: 10, outerStrength: 1.5, color: color });
        } else {
          filter = createFallbackFilter(color, 1);
        }
    }

    if (!filter) return;
    filter._rnkIllumination = true;

    const existingFilters = sprite.filters ? [...sprite.filters] : [];
    existingFilters.push(filter);
    sprite.filters = existingFilters;

    // Apply pulsation if token is targeted
    if (pulsate) {
      startPulsatingAnimation(filter, settings.effect);
    } else {
      stopPulsatingAnimation(filter);
    }
  } catch (err) {
    console.error("RNK™ Illumination | Failed to apply effect", err);
  }
}

/**
 * Remove illumination effect from a token
 * @param {Token} token - The token to remove effect from
 */
export function removeEffect(token) {
  if (!token) return;
  const sprite = token.mesh || token.icon;
  if (!sprite || !sprite.filters) return;

  try {
    // Stop any pulsating animations
    if (sprite.filters) {
      sprite.filters.forEach(f => {
        if (f._rnkIllumination) {
          stopPulsatingAnimation(f);
        }
      });
    }
    
    const filtered = sprite.filters.filter(f => !f._rnkIllumination);
    sprite.filters = filtered.length > 0 ? filtered : null;
  } catch (err) {
    console.error("RNK™ Illumination | Failed to remove effect", err);
  }
}

/**
 * Start pulsating animation on the filter
 * @param {PIXI.Filter} filter - The filter to animate
 * @param {string} effectType - The effect type
 */
export function startPulsatingAnimation(filter, effectType) {
  if (filter._pulsatingTween) return;

  let targetProperty, minValue, maxValue;

  if (effectType === 'glow' || effectType === 'neon') {
    targetProperty = 'distance';
    minValue = effectType === 'glow' ? 5 : 10;
    maxValue = effectType === 'glow' ? 20 : 35;
  } else if (effectType === 'outline') {
    targetProperty = 'thickness';
    minValue = 1;
    maxValue = 6;
  } else {
    targetProperty = 'alpha';
    minValue = 0.4;
    maxValue = 1.0;
  }

  if (filter[targetProperty] === undefined) {
    if (filter.outerStrength !== undefined) targetProperty = 'outerStrength';
    else if (filter.blur !== undefined) targetProperty = 'blur';
    else return;
  }

  // Use global GSAP if available
  const gsapLib = globalThis.gsap || (typeof gsap !== 'undefined' ? gsap : null);
  if (!gsapLib) return;

  filter._pulsatingTween = gsapLib.to(filter, {
    [targetProperty]: maxValue,
    duration: 0.8,
    yoyo: true,
    repeat: -1,
    ease: "power2.inOut"
  });
}

/**
 * Stop pulsating animation on the filter
 * @param {PIXI.Filter} filter - The filter to stop animating
 */
export function stopPulsatingAnimation(filter) {
  if (filter._pulsatingTween) {
    const gsapLib = globalThis.gsap || (typeof gsap !== 'undefined' ? gsap : null);
    if (gsapLib) {
      gsapLib.killTweensOf(filter);
    }
    filter._pulsatingTween = null;
  }
}
