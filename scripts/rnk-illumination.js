/**
 * RNK Illumination Module
 * Advanced token illumination with custom underglow effects and hubs.
 */

import { DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { clearTargetingIndicators, hideTargetingIndicator, showTargetingIndicator } from './targeting.js';
import { applyEffect, removeEffect, sanitizeColor } from './effects.js';
import { openIlluminationHub, RNKGMHub } from './hub.js';

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
  
  // Find the token owned by this user (NOT the controlled token)
  // We need the user's own token, not the one they're controlling
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

Hooks.on('canvasReady', () => {
  initTargetingLines();
  refreshAllTokenIllumination();
});

Hooks.on('targetToken', (user, token, isTargeted) => {
  console.log('RNK™ Illumination | ========== ALL TOKENS ON SCENE ==========');
  canvas.tokens.placeables.forEach(t => {
    console.log(`  - ${t.name} (ID: ${t.id}) Owner: ${t.actor?.name}`);
  });
  console.log('RNK™ Illumination | =========================================');
  
  console.log('RNK™ Illumination | targetToken hook fired!', { 
    user: user?.name, 
    token: token?.name,
    tokenId: token?.id,
    isTargeted 
  });
  
  setTimeout(() => {
    refreshTokenIllumination(token);
    if (user) {
      console.log('RNK™ Illumination | Controlled tokens:', canvas.tokens.controlled.map(t => `${t.name} (${t.id})`));
      console.log('RNK™ Illumination | Looking for user token for:', user.name);
      const userToken = getUserToken(user);
      console.log('RNK™ Illumination | User token found:', userToken?.name, 'ID:', userToken?.id);
      console.log('RNK™ Illumination | Target token:', token?.name, 'ID:', token?.id);
      
      if (userToken) {
        refreshTokenIllumination(userToken);
        
        // Don't draw line to self
        if (userToken.id === token.id) {
          console.log('RNK™ Illumination | Cannot draw line to self, skipping');
          return;
        }
        
        // Draw targeting line if token is targeted
        if (isTargeted) {
          console.log('RNK™ Illumination | Token IS targeted, drawing line');
          const settings = getUserSettings(user.id);
          drawTargetingLine(userToken, token, settings.color, settings.symbol);
        } else {
          console.log('RNK™ Illumination | Token NOT targeted, removing line');
          removeTargetingLine(userToken, token);
        }
      } else {
        console.log('RNK™ Illumination | No user token found - cannot draw line');
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
    title: 'RNK Illumination',
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

// Targeting lines - Map of user IDs to Maps of target IDs to Graphics objects
const _targetingLines = new Map();

/**
 * Get or create targeting line graphics for a user-target pair
 */
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

/**
 * Draw targeting line from user token to target
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 * @param {string} color - The color for the line
 * @param {string} symbol - The symbol/icon for markers
 */
function drawTargetingLine(userToken, targetToken, color, symbol) {
  if (!userToken || !targetToken || !canvas) {
    console.log('RNK™ Illumination | Cannot draw line - missing token or canvas');
    return;
  }
  
  const userId = userToken.actor?.id || userToken.id;
  const targetId = targetToken.id;
  const graphics = getTargetingLineGraphics(userId, targetId);
  
  console.log(`RNK™ Illumination | Drawing targeting line from ${userToken.name} to ${targetToken.name} with color ${color}`);

  // Clear this specific line
  graphics.clear();

  const startX = userToken.center.x;
  const startY = userToken.center.y;
  const endX = targetToken.center.x;
  const endY = targetToken.center.y;
  
  console.log(`RNK™ Illumination | Line coords: (${startX}, ${startY}) to (${endX}, ${endY})`);

  const colorValue = Color.from(color).valueOf();
  console.log(`RNK™ Illumination | Line color: ${color} = 0x${colorValue.toString(16)}`);

  // Calculate distance
  const pixelDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const gridDistance = pixelDistance / canvas.grid.size;
  const unitDistance = gridDistance * (canvas.scene.grid.distance || 5);
  const units = canvas.scene.grid.units || 'ft';

  // Draw line with user's color
  graphics.lineStyle(4, colorValue, 1);
  graphics.moveTo(startX, startY);
  graphics.lineTo(endX, endY);
  
  console.log(`RNK™ Illumination | Line drawn from (${startX},${startY}) to (${endX},${endY}) with color ${color}`);

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

      // Draw icon symbol if provided
      if (symbol) {
        const iconText = new PIXI.Text(symbol, {
          fontFamily: 'Arial',
          fontSize: 20,
          fill: colorValue,
          align: 'center',
          stroke: 0x000000,
          strokeThickness: 2
        });
        iconText.anchor.set(0.5, 0.5);
        iconText.position.set(markerX, markerY);
        graphics.addChild(iconText);
      } else {
        // Fallback to dot if no symbol
        graphics.lineStyle(0);
        graphics.beginFill(colorValue, 0.8);
        graphics.drawCircle(markerX, markerY, 5);
        graphics.endFill();
      }

      // Draw distance label
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
  }

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
  
  console.log(`RNK™ Illumination | Line complete with ${numMarkers} markers`);
}

/**
 * Remove targeting line between two tokens
 * @param {Token} userToken - The user's token
 * @param {Token} targetToken - The targeted token
 */
function removeTargetingLine(userToken, targetToken) {
  const userId = userToken.actor?.id || userToken.id;
  const targetId = targetToken.id;
  
  if (_targetingLines.has(userId)) {
    const userLines = _targetingLines.get(userId);
    if (userLines.has(targetId)) {
      const graphics = userLines.get(targetId);
      graphics.destroy();
      userLines.delete(targetId);
      console.log(`RNK™ Illumination | Targeting line removed for ${userId} -> ${targetId}`);
      
      // Clean up empty maps
      if (userLines.size === 0) {
        _targetingLines.delete(userId);
      }
    }
  }
}

/**
 * Clear all targeting lines
 */
function clearTargetingLines() {
  _targetingLines.forEach((userLines) => {
    userLines.forEach((graphics) => {
      graphics.destroy();
    });
  });
  _targetingLines.clear();
}

// Global exposure
globalThis.refreshAllTokenIllumination = refreshAllTokenIllumination;
globalThis.openIlluminationHub = openIlluminationHub;
globalThis.RNKGMHub = RNKGMHub;
