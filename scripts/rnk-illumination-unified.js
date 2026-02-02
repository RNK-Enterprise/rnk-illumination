/**
 * RNK™ Illumination Module
 * Advanced token illumination with custom underglow effects and GM hub.
 */

import { DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { clearTargetingIndicators, hideTargetingIndicator, showTargetingIndicator } from './targeting.js';
import { applyEffect, removeEffect, sanitizeColor } from './effects.js';
import { openIlluminationHub, RNKGMHub } from './hub.js';

console.log('RNK™ Illumination | Unified version loaded');

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

// Targeting line container
let _targetingLineContainer = null;

/**
 * Initialize targeting line container
 */
function initTargetingLines() {
  if (_targetingLineContainer && !_targetingLineContainer.destroyed) return;
  _targetingLineContainer = new PIXI.Container();
  _targetingLineContainer.name = 'rnk-targeting-lines';
  canvas.stage.addChild(_targetingLineContainer);
  _targetingLineContainer.zIndex = 1000;
}

/**
 * Clear all targeting lines
 */
function clearTargetingLines() {
  if (_targetingLineContainer) {
    _targetingLineContainer.removeChildren();
  }
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

  // Calculate distance
  const pixelDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const gridDistance = pixelDistance / canvas.grid.size;
  const unitDistance = gridDistance * (canvas.scene.grid.distance || 5);
  const units = canvas.scene.grid.units || 'ft';

  // Draw line
  graphics.lineStyle(3, colorValue, 1);
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);

  // Draw measurement markers
  const markerInterval = 5; // feet
  const numMarkers = Math.floor(unitDistance / markerInterval);

  if (numMarkers > 0) {
    const dx = endX - startX;
    const dy = endY - startY;
    const totalLength = Math.sqrt(dx * dx + dy * dy);
    const unitVectorX = dx / totalLength;
    const unitVectorY = dy / totalLength;

    for (let i = 1; i <= numMarkers; i++) {
      const distance = i * markerInterval;
      const pixelDistance = (distance / (canvas.scene.grid.distance || 5)) * canvas.grid.size;
      const markerX = startX + unitVectorX * pixelDistance;
      const markerY = startY + unitVectorY * pixelDistance;

      // Draw marker dot
      graphics.beginFill(colorValue, 1);
      graphics.drawCircle(markerX, markerY, 4);
      graphics.endFill();

      // Add text label
      const text = new PIXI.Text(`${distance}${units}`, {
        fontSize: 14,
        fill: 0xFFFFFF,
        stroke: 0x000000,
        strokeThickness: 3
      });
      text.anchor.set(0.5);
      text.position.set(markerX, markerY - 15);
      graphics.addChild(text);
    }
  }

  // Add total distance label at midpoint
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const totalText = new PIXI.Text(`${Math.round(unitDistance)}${units}`, {
    fontSize: 16,
    fontWeight: 'bold',
    fill: 0xFFFFFF,
    stroke: 0x000000,
    strokeThickness: 4
  });
  totalText.anchor.set(0.5);
  totalText.position.set(midX, midY);
  graphics.addChild(totalText);

  _targetingLineContainer.addChild(graphics);
}

/**
 * Remove targeting line between two tokens
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 */
function removeTargetingLine(userToken, targetToken) {
  if (!_targetingLineContainer || !userToken || !targetToken) return;
  const existing = _targetingLineContainer.children.find(c => c.name === `line-${userToken.id}-${targetToken.id}`);
  if (existing) _targetingLineContainer.removeChild(existing);
}

// ============================================================================
// HOOKS
// ============================================================================

Hooks.on('init', () => {
  console.log('RNK™ Illumination | init hook fired');
  
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
  console.log('RNK™ Illumination | ready hook fired');
  
  if (game.user?.isGM) {
    console.log('RNK™ Illumination | Registering GM Hub');
    game.settings.registerMenu(MODULE_ID, 'gmHub', {
      name: 'RNK™ Illumination Hub',
      label: 'Open Hub',
      hint: 'Configure player illumination colors and effects',
      icon: 'fas fa-palette',
      type: RNKGMHub,
      restricted: true
    });
  }
  
  if (canvas?.tokens?.placeables) refreshAllTokenIllumination();
});

Hooks.on('canvasReady', () => {
  console.log('RNK™ Illumination | canvasReady hook fired');
  refreshAllTokenIllumination();
  initTargetingLines();
});

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
  if (!controls) return controls;
  if (!game.user?.isGM) return controls;
  const controlData = {
    name: MODULE_ID,
    title: 'RNK™ Illumination',
    icon: 'fa-solid fa-sun',
    order: 99999,
    layer: 'controls',
    visible: true,
    tools: [
      {
        name: 'illumination-hub',
        title: 'Open Hub',
        icon: 'fa-solid fa-palette',
        onClick: () => openIlluminationHub(),
        button: true,
        toggle: false,
        active: false,
        order: 0
      }
    ]
  };
  if (Array.isArray(controls)) {
    controls.push(controlData);
  } else if (typeof controls === 'object' && controls !== null) {
    controls[MODULE_ID] = controlData;
  }
  return controls;
});

Hooks.on('renderSceneControls', (app, html, data) => {
  if (!game.user?.isGM) return;
  const root = (html instanceof HTMLElement) ? html : (html?.[0] || document);
  const button = root.querySelector(`[data-control="${MODULE_ID}"]`) ||
                 document.querySelector(`[data-control="${MODULE_ID}"]`);
  if (!button) return;
  button.classList.add('module-control-btn');
  if (button.dataset.moduleHandler) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openIlluminationHub();
  });
  button.dataset.moduleHandler = 'true';
});

console.log('RNK™ Illumination | Module fully initialized');
