/**
 * RNK Illumination Module
 * Advanced token illumination with custom underglow effects and hubs.
 */

import { DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { applyEffect, removeEffect, sanitizeColor } from './effects-Wohdan.js';
import { openIlluminationHub, RNKGMHub } from './hub-Wohdan.js';

console.log('RNK™ Illumination Wohdan | Script file loaded');

// Debounce timer for refresh all
let _refreshAllTimeout = null;
let _targetingLineContainer = null;

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
  
  // If this is the current active player, prefer controlled token
  if (user.id === game.user.id && canvas.tokens.controlled.length > 0) {
    return canvas.tokens.controlled[0];
  }

  // Otherwise find a token they own
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
  
  // Get all users who are targeting this token
  const targetingUsers = [];
  for (const user of game.users || []) {
    if (user.targets && user.targets.has(token)) {
      targetingUsers.push(user);
    }
  }
  
  const tokenOwner = getTokenOwner(token);
  const isOwnerTargeting = tokenOwner && isUserTargeting(tokenOwner);

  // Apply visual effects to the token itself
  if (targetingUsers.length > 0 || isOwnerTargeting) {
    const primaryUser = targetingUsers[0] || tokenOwner;
    const settings = getUserSettings(primaryUser.id);
    applyEffect(token, settings, targetingUsers.length > 0);
    // showTargetingIndicator(token, settings.color, settings.symbol);
  } else {
    // hideTargetingIndicator(token);
    if (tokenOwner) {
      applyEffect(token, getUserSettings(tokenOwner.id), false);
    } else {
      removeEffect(token);
    }
  }

  // Draw lines FROM each user targeting this token TO the target
  if (targetingUsers.length > 0) {
    initTargetingLines(); // Ensure container exists
    
    for (const targetingUser of targetingUsers) {
      const userToken = getUserToken(targetingUser);
      if (userToken && userToken !== token) {
        const settings = getUserSettings(targetingUser.id);
        console.log(`RNK™ Illumination | Drawing line from ${userToken.name} to ${token.name}`);
        drawTargetingLine(userToken, token, settings.color);
      }
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
  console.log('RNK™ Illumination | Init hook fired - module initializing');
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
  console.log("RNK™ Illumination | Wohdan Edition - Activated");
  console.log("RNK™ Illumination | Current user:", game.user?.name);
  console.log("RNK™ Illumination | Is GM:", game.user?.isGM);
  
  if (game.user?.isGM) {
    console.log("RNK™ Illumination | GM detected, registering hub...");
    console.log("RNK™ Illumination | MODULE_ID:", MODULE_ID);
    console.log("RNK™ Illumination | RNKGMHub class:", typeof RNKGMHub, RNKGMHub?.name);
    
    try {
      game.settings.registerMenu(MODULE_ID, 'gmHub', {
        name: 'RNK Illumination Hub',
        label: 'Open Hub',
        hint: 'Configure player illumination colors and effects',
        icon: 'fas fa-palette',
        type: RNKGMHub,
        restricted: true
      });
      console.log("RNK™ Illumination | Hub registered successfully!");
    } catch (error) {
      console.error("RNK™ Illumination | Error registering hub:", error);
    }
  } else {
    console.log("RNK™ Illumination | User is not GM, skipping hub registration");
  }
  
  setTimeout(() => {
    if (canvas?.tokens?.placeables) refreshAllTokenIllumination();
    initTargetingLines();
  }, 500);
});

Hooks.on('canvasReady', () => {
  refreshAllTokenIllumination();
  initTargetingLines();
});

Hooks.on('targetToken', (user, token) => {
  console.log(`RNK™ Illumination | targetToken hook fired! User: ${user?.name}, Token: ${token?.name}`);
  setTimeout(() => {
    console.log(`RNK™ Illumination | Calling refreshTokenIllumination for token: ${token?.name}`);
    refreshTokenIllumination(token);
    if (user) {
      const userToken = getUserToken(user);
      if (userToken) {
        console.log(`RNK™ Illumination | Calling refreshTokenIllumination for user token: ${userToken?.name}`);
        refreshTokenIllumination(userToken);
      }
    }
  }, 50);
});

Hooks.on('createToken', (tokenDoc) => {
  if (tokenDoc.object) refreshTokenIllumination(tokenDoc.object);
});

Hooks.on('updateToken', (tokenDoc, changes) => {
  if (changes.x || changes.y || changes.elevation || changes.rotation || changes.actorLink || changes.actorId || changes.disposition) {
    const token = tokenDoc.object;
    if (token) {
      refreshTokenIllumination(token);
      
      // Also update lines for tokens being targeted by owners of this token
      for (const u of game.users) {
        const ut = getUserToken(u);
        if (ut === token) {
          u.targets.forEach(t => refreshTokenIllumination(t));
        }
      }
    }
  }
});

Hooks.on('deleteToken', (tokenDoc) => {
  if (tokenDoc.object) {
    removeEffect(tokenDoc.object);
    // hideTargetingIndicator(tokenDoc.object);
  }
});

Hooks.on('canvasTearDown', () => {
  if (canvas?.tokens?.placeables) {
    canvas.tokens.placeables.forEach(token => {
      removeEffect(token);
      // hideTargetingIndicator(token);
    });
  }
  // clearTargetingIndicators();
  clearTargetingLines();
});

// Button Registration Standard
Hooks.on('getSceneControlButtons', (controls) => {
  if (!controls) return controls;
  if (!game.user?.isGM) return controls;
  const controlData = {
    name: MODULE_ID,
    title: 'RNK Illumination',
    icon: 'fa-solid fa-sun',
    layer: 'controls',
    visible: true,
    tools: [
      {
        name: 'illumination-hub',
        title: 'Open Hub',
        icon: 'fa-solid fa-palette',
        onClick: () => openIlluminationHub(),
        button: true
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
  const button = html.querySelector(`[data-control="${MODULE_ID}"]`);
  if (button) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openIlluminationHub();
    });
  }
});

// Targeting functions
/**
 * Initialize targeting line container
 */
function initTargetingLines() {
  if (!canvas?.ready) return;
  
  // Check if container already exists and is properly attached
  if (_targetingLineContainer && !_targetingLineContainer.destroyed && _targetingLineContainer.parent) {
    return;
  }
  
  // Clean up old container if needed
  if (_targetingLineContainer && !_targetingLineContainer.destroyed) {
    try {
      _targetingLineContainer.removeFromParent();
      _targetingLineContainer.destroy({ children: true });
    } catch (e) {}
  }
  
  // Create new container
  _targetingLineContainer = new PIXI.Container();
  _targetingLineContainer.name = 'rnk-targeting-lines';
  _targetingLineContainer.sortableChildren = true;
  
  // Add to tokens layer (most reliable)
  if (canvas.tokens) {
    canvas.tokens.addChild(_targetingLineContainer);
    _targetingLineContainer.zIndex = 999;
  } else if (canvas.stage) {
    canvas.stage.addChild(_targetingLineContainer);
    _targetingLineContainer.zIndex = 10000;
  }
}

/**
 * Draw targeting line from user token to target
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 * @param {string} color - The color for the line
 */
function drawTargetingLine(userToken, targetToken, color) {
  if (!userToken || !targetToken || !canvas?.ready) return;

  console.log(`RNK™ Illumination | Attempting to draw line. Container exists: ${!!_targetingLineContainer}, Canvas ready: ${canvas.ready}`);
  
  initTargetingLines();
  if (!_targetingLineContainer) {
    console.error("RNK™ Illumination | Failed to initialize targeting line container");
    return;
  }

  const lineName = `line-${userToken.id}-${targetToken.id}`;
  const existing = _targetingLineContainer.children.find(c => c.name === lineName);
  if (existing) _targetingLineContainer.removeChild(existing);

  const graphics = new PIXI.Graphics();
  graphics.name = lineName;

  const startX = userToken.center.x;
  const startY = userToken.center.y;
  const endX = targetToken.center.x;
  const endY = targetToken.center.y;

  console.log(`RNK™ Illumination | Line from (${startX},${startY}) to (${endX},${endY}), color: ${color}`);

  // Safe color conversion
  let colorValue = 0xffffff;
  try {
    if (typeof Color !== 'undefined') {
      colorValue = Color.from(color).valueOf();
    } else {
      colorValue = parseInt(color.replace('#', '0x'));
    }
  } catch (e) {
    console.warn("RNK™ Illumination | Color conversion failed:", e);
    colorValue = 0xffffff;
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  if (pixelDistance < 5) {
    console.log("RNK™ Illumination | Tokens too close, skipping line");
    return;
  }

  // Calculate game distance
  const gridSize = canvas.grid.size || 100;
  const unitDistance = Math.round((pixelDistance / gridSize) * (canvas.scene.grid.distance || 5) * 10) / 10;
  const units = canvas.scene.grid.units || 'ft';

  // --- DRAWING START ---
  graphics.clear();
  graphics.lineStyle(0);
  
  try {
    // Step 1: Draw black outline line for maximum contrast
    graphics.lineStyle(8, 0x000000, 0.7);
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
    
    // Step 2: Draw colored line on top
    graphics.lineStyle(4, colorValue, 1.0);
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);

    // Step 3: Draw distance label
    const midX = startX + dx * 0.5;
    const midY = startY + dy * 0.5;
    const ux = dx / pixelDistance;
    const uy = dy / pixelDistance;
    const offsetX = -uy * 40;
    const offsetY = ux * 40;

    const text = new PIXI.Text(`${unitDistance} ${units}`, {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: colorValue,
      stroke: 0x000000,
      strokeThickness: 4
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(midX + offsetX, midY + offsetY);
    graphics.addChild(text);

    // Step 4: Draw 5ft interval markers
    const markerInterval = 5;
    const numMarkers = Math.floor(unitDistance / markerInterval);
    if (numMarkers > 0) {
      graphics.lineStyle(0);
      graphics.beginFill(colorValue, 1.0);
      for (let i = 1; i <= numMarkers; i++) {
        const dist = i * markerInterval;
        if (dist >= unitDistance - 1) continue;
        const f = dist / unitDistance;
        graphics.drawCircle(startX + dx * f, startY + dy * f, 5);
      }
      graphics.endFill();
    }

    // Step 5: Draw arrowhead at target token
    const angle = Math.atan2(dy, dx);
    const arrowSize = 18;
    graphics.lineStyle(0);
    graphics.beginFill(colorValue, 1.0);
    graphics.moveTo(endX, endY);
    graphics.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI/6),
      endY - arrowSize * Math.sin(angle - Math.PI/6)
    );
    graphics.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI/6),
      endY - arrowSize * Math.sin(angle + Math.PI/6)
    );
    graphics.closePath();
    graphics.endFill();
    
    // Add to container
    _targetingLineContainer.addChild(graphics);
    console.log(`RNK™ Illumination | Line added to container. Container now has ${_targetingLineContainer.children.length} children`);
  } catch (err) {
    console.error("RNK™ Illumination | Error drawing line:", err);
    return;
  }

  _targetingLineContainer.addChild(graphics);
}

/**
 * Remove targeting line
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 */
function removeTargetingLine(userToken, targetToken) {
  if (!_targetingLineContainer || _targetingLineContainer.destroyed) return;
  const name = `line-${userToken.id}-${targetToken.id}`;
  const existing = _targetingLineContainer.children.find(c => c.name === name);
  if (existing) _targetingLineContainer.removeChild(existing);
}

/**
 * Clear all targeting lines
 */
function clearTargetingLines() {
  if (_targetingLineContainer && !_targetingLineContainer.destroyed) {
    _targetingLineContainer.removeChildren();
  }
}

// Global exposure
globalThis.refreshAllTokenIllumination = refreshAllTokenIllumination;
globalThis.openIlluminationHub = openIlluminationHub;
globalThis.RNKGMHub = RNKGMHub;
