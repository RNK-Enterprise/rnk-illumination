/**
 * RNK Illumination Module
 * Advanced token illumination with custom underglow effects and hubs.
 */

import { DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { clearTargetingIndicators, hideTargetingIndicator, showTargetingIndicator } from './targeting.js';
import { applyEffect, removeEffect, sanitizeColor } from './effects.js';
import { RNKGMHub } from './hub.js';

// Debounce timer for refresh all
let _refreshAllTimeout = null;

/**
 * Get user illumination settings with fallback to defaults
 * @param {string} userId - The user ID to get settings for
 * @returns {Object} Settings object
 */
function getUserSettings(userId) {
  const user = game.users?.get(userId);
  const raw = user ? (user.getFlag(MODULE_ID, 'settings') || {}) : {};
  return {
    color: sanitizeColor(raw.color || DEFAULT_SETTINGS.color),
    effect: raw.effect || DEFAULT_SETTINGS.effect,
    symbol: raw.symbol || DEFAULT_SETTINGS.symbol
  };
}

/**
 * Get the token that belongs to a specific user
 */
function getUserToken(user) {
  if (!user || !canvas?.tokens?.placeables) return null;
  return canvas.tokens.placeables.find(token => {
    const actor = token.actor;
    return actor?.testUserPermission(user, 'OWNER');
  }) || null;
}

/**
 * Get the owner of a token
 */
function getTokenOwner(token) {
  const actor = token.actor;
  if (!actor) return null;
  const owners = game.users.filter(u => actor.testUserPermission(u, 'OWNER'));
  const playerOwner = owners.find(u => !u.isGM);
  return playerOwner || owners[0] || null;
}

/**
 * Check if a token is targeted by any user
 */
function getTargetingUser(token) {
  for (const user of game.users) {
    if (user.targets?.has(token)) return user;
  }
  return null;
}

/**
 * Check if a user is targeting anything
 */
function isUserTargeting(user) {
  return (user?.targets?.size ?? 0) > 0;
}

/**
 * Refresh illumination for a single token
 */
export function refreshTokenIllumination(token) {
  if (!token) return;
  const targetingUser = getTargetingUser(token);
  const tokenOwner = getTokenOwner(token);
  const isOwnerTargeting = tokenOwner && isUserTargeting(tokenOwner);

  if (targetingUser || isOwnerTargeting) {
    const activeUser = targetingUser || tokenOwner;
    const settings = getUserSettings(activeUser.id);
    applyEffect(token, settings);
    showTargetingIndicator(token, settings.color, settings.symbol);
  } else {
    hideTargetingIndicator(token);
    if (tokenOwner) {
      applyEffect(token, getUserSettings(tokenOwner.id));
    } else {
      removeEffect(token);
    }
  }
}

/**
 * Refresh illumination for all tokens
 */
export function refreshAllTokenIllumination() {
  if (_refreshAllTimeout) clearTimeout(_refreshAllTimeout);
  _refreshAllTimeout = setTimeout(() => {
    _refreshAllTimeout = null;
    if (!canvas?.tokens?.placeables) return;
    canvas.tokens.placeables.forEach(token => {
      try { refreshTokenIllumination(token); } catch (e) {}
    });
  }, 50);
}

// Hooks
Hooks.on('init', () => {
  // Register keybinding for targeting hovered token
  game.keybindings.register(MODULE_ID, 'targetHovered', {
    name: 'Target Hovered Token',
    hint: 'Toggle targeting on the currently hovered token',
    editable: [{ key: 'KeyT', modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
    onDown: () => {
      const hoveredToken = canvas.tokens._hover;
      if (hoveredToken) {
        hoveredToken.setTarget(!hoveredToken.isTargeted, { user: game.user });
      }
    }
  });
});

Hooks.on('ready', () => {
  if (game.user?.isGM) {
    game.settings.registerMenu(MODULE_ID, 'gmHub', {
      name: 'RNK Illumination Hub',
      label: 'Open Hub',
      hint: 'Configure player illumination colors and effects',
      icon: 'fas fa-palette',
      type: RNKGMHub,
      restricted: true
    });
  }
  if (canvas?.tokens?.placeables) refreshAllTokenIllumination();
});

Hooks.on('canvasReady', refreshAllTokenIllumination);

Hooks.on('targetToken', (user, token) => {
  setTimeout(() => {
    refreshTokenIllumination(token);
    if (user) {
      const userToken = getUserToken(user);
      if (userToken) {
        refreshTokenIllumination(userToken);
        // Draw targeting line if token is targeted
        if (token.isTargeted) {
          const settings = getUserSettings(user.id);
          drawTargetingLine(userToken, token, settings.color);
        } else {
          removeTargetingLine(userToken, token);
        }
      }
    }
  }, 50);
});

Hooks.on('createToken', (tokenDoc) => {
  if (tokenDoc.object) refreshTokenIllumination(tokenDoc.object);
});

Hooks.on('updateToken', (tokenDoc, changes) => {
  if (changes.actorLink || changes.actorId || changes.disposition) {
    if (tokenDoc.object) refreshTokenIllumination(tokenDoc.object);
  }
});

Hooks.on('deleteToken', (tokenDoc) => {
  if (tokenDoc.object) {
    removeEffect(tokenDoc.object);
    hideTargetingIndicator(tokenDoc.object);
  }
});

Hooks.on('canvasTearDown', () => {
  if (canvas?.tokens?.placeables) {
    canvas.tokens.placeables.forEach(token => {
      removeEffect(token);
      hideTargetingIndicator(token);
    });
  }
  clearTargetingIndicators();
  clearTargetingLines();
});

// Button Registration Standard
Hooks.on('getSceneControlButtons', (controls) => {
  // Removed redundant illumination hub button - use module settings instead
});

// Targeting line container
let _targetingLineContainer = null;

/**
 * Initialize targeting line container
 */
function initTargetingLines() {
  if (_targetingLineContainer) return;
  _targetingLineContainer = new PIXI.Container();
  _targetingLineContainer.name = 'rnk-targeting-lines';
  canvas.stage.addChild(_targetingLineContainer);
  _targetingLineContainer.zIndex = 1000;
}

/**
 * Draw targeting line from user token to target
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 * @param {string} color - The color for the line
 */
function drawTargetingLine(userToken, targetToken, color) {
  if (!userToken || !targetToken || !canvas) return;

  initTargetingLines();

  // Remove existing line for this pair
  const existing = _targetingLineContainer.children.find(c => c.name === `line-${userToken.id}-${targetToken.id}`);
  if (existing) _targetingLineContainer.removeChild(existing);

  const graphics = new PIXI.Graphics();
  graphics.name = `line-${userToken.id}-${targetToken.id}`;

  const startX = userToken.center.x;
  const startY = userToken.center.y;
  const endX = targetToken.center.x;
  const endY = targetToken.center.y;

  const colorValue = Color.from(color).valueOf();

  // Draw line
  graphics.lineStyle(3, colorValue, 1);
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);

  // Draw arrows
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowLength = 15;
  const arrowAngle = Math.PI / 6; // 30 degrees

  // Arrowhead at end
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

  _targetingLineContainer.addChild(graphics);
}

/**
 * Remove targeting line
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 */
function removeTargetingLine(userToken, targetToken) {
  if (!_targetingLineContainer) return;
  const existing = _targetingLineContainer.children.find(c => c.name === `line-${userToken.id}-${targetToken.id}`);
  if (existing) _targetingLineContainer.removeChild(existing);
}

/**
 * Clear all targeting lines
 */
function clearTargetingLines() {
  if (_targetingLineContainer) {
    _targetingLineContainer.removeChildren();
  }
}

// Global exposure
globalThis.refreshAllTokenIllumination = refreshAllTokenIllumination;
globalThis.RNKGMHub = RNKGMHub;
