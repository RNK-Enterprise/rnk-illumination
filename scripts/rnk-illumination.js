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
    editable: [{ key: 'KeyT', modifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT] }],
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
      if (userToken) refreshTokenIllumination(userToken);
    }
    // Fix for core targeting markers not persisting on multiple targets
    setTimeout(() => {
      canvas.tokens.placeables.forEach(t => {
        if (t.isTargeted && !t.target) {
          const g = new PIXI.Graphics();
          g.name = 'target';
          const color = 0xFF9829; // Foundry's default target color
          const size = Math.max(t.w, t.h) / 6;
          g.lineStyle(2, color, 1.0);
          // Draw the 4 corner arrows
          // Top-left
          g.moveTo(0, 0);
          g.lineTo(size, 0);
          g.moveTo(0, 0);
          g.lineTo(0, size);
          // Top-right
          g.moveTo(t.w, 0);
          g.lineTo(t.w - size, 0);
          g.moveTo(t.w, 0);
          g.lineTo(t.w, size);
          // Bottom-left
          g.moveTo(0, t.h);
          g.lineTo(size, t.h);
          g.moveTo(0, t.h);
          g.lineTo(0, t.h - size);
          // Bottom-right
          g.moveTo(t.w, t.h);
          g.lineTo(t.w - size, t.h);
          g.moveTo(t.w, t.h);
          g.lineTo(t.w, t.h - size);
          t.addChild(g);
          t.target = g;
        }
      });
    }, 100);
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
});

// Button Registration Standard
Hooks.on('getSceneControlButtons', (controls) => {
  if (game.user.isGM) {
    console.log('RNK Illumination | getSceneControlButtons hook fired');
    const moduleTools = buildModuleTools();
    const controlData = {
      name: MODULE_ID,
      title: 'RNK Illumination',
      icon: 'fa-solid fa-sun',
      order: 99999,
      visible: true,
      tools: moduleTools
    };
    if (Array.isArray(controls)) controls.push(controlData);
    else controls[MODULE_ID] = controlData;
  }
});

function buildModuleTools() {
  const tools = [];
  tools.push({
    name: 'illumination-hub',
    title: 'Open Hub',
    icon: 'fa-solid fa-palette',
    order: 0,
    button: true,
    toggle: false,
    active: false,
    onClick: () => {
      console.log('RNK Illumination | Tool clicked');
      openIlluminationHub();
    }
  });
  return tools;
}

Hooks.on('renderSceneControls', (app, html) => {
  if (!game.user.isGM) return;
  requestAnimationFrame(() => {
    injectModuleButtons(html);
  });
});

function injectModuleButtons(html) {
  const root = (html instanceof HTMLElement) ? html : (html[0] || document);
  const button = root.querySelector(`[data-control="${MODULE_ID}"]`) ||
                 document.querySelector(`[data-control="${MODULE_ID}"]`);
  if (!button) return;
  button.classList.add('module-control-btn');
  if (!button.dataset.moduleHandler) {
    button.addEventListener('click', (event) => {
      const isActive = button.classList.contains('active') || button.getAttribute('aria-pressed') === 'true';
      if (isActive) {
        event.preventDefault();
        event.stopPropagation();
        openIlluminationHub();
      }
    });
    button.dataset.moduleHandler = 'true';
  }
}

// Global exposure
globalThis.refreshAllTokenIllumination = refreshAllTokenIllumination;
globalThis.openIlluminationHub = openIlluminationHub;
globalThis.RNKGMHub = RNKGMHub;
