/**
 * RNK™ Illumination Module
 * Advanced token illumination with custom underglow effects and hubs.
 */

import {
  AVAILABLE_EFFECTS,
  AVAILABLE_RANGES,
  AVAILABLE_SYMBOLS,
  DEFAULT_SETTINGS,
  DEFAULT_TARGETING_ENABLED,
  MODULE_ID
} from './constants.js';
import { clearTargetingIndicators, hideTargetingIndicator, showTargetingIndicator } from './targeting.js';
import { applyEffect, removeEffect, sanitizeColor } from './effects.js';
import { openIlluminationHub, RNKGMHub } from './hub.js';
import {
  clearTargetingLines,
  clearTargetingLinesForToken,
  configureTargetingLines,
  drawTargetingLine,
  removeTargetingLine,
  updateTokenTargetingLines
} from './targeting-lines.js';
import { sanitizeSymbol } from './targeting.js';

// Debounce timer for refresh all
let _refreshAllTimeout = null;
const PLACEABLE_SETTINGS_FLAG = 'illuminationSettings';

function normalizeEffectSettings(raw = {}) {
  const customSymbol = typeof raw.customSymbol === 'string' ? raw.customSymbol.trim() : '';
  const symbolSource = customSymbol || raw.symbol || DEFAULT_SETTINGS.symbol;
  return {
    color: sanitizeColor(raw.color || DEFAULT_SETTINGS.color),
    effect: AVAILABLE_EFFECTS.includes(raw.effect) ? raw.effect : DEFAULT_SETTINGS.effect,
    symbol: sanitizeSymbol(symbolSource),
    customSymbol,
    intensity: Number.parseFloat(raw.intensity) || DEFAULT_SETTINGS.intensity,
    range: Number.parseInt(raw.range, 10) || DEFAULT_SETTINGS.range
  };
}

/**
 * Get user illumination settings with fallback to defaults
 * @param {string} userId - The user ID to get settings for
 * @returns {Object} Settings object
 */
function getUserSettings(userId) {
  const user = game.users?.get(userId);
  const raw = user ? (user.getFlag(MODULE_ID, 'settings') || {}) : {};
  return normalizeEffectSettings(raw);
}

function getTargetingVisualsEnabled() {
  return game.settings.get(MODULE_ID, 'targetingEnabled') ?? DEFAULT_TARGETING_ENABLED;
}

function getPlaceableSettings(placeable) {
  if (!placeable) return null;
  const raw = placeable.document?.getFlag?.(MODULE_ID, PLACEABLE_SETTINGS_FLAG) ||
    placeable.getFlag?.(MODULE_ID, PLACEABLE_SETTINGS_FLAG);
  if (!raw) return null;
  return normalizeEffectSettings(raw);
}

async function setPlaceableSettings(placeable, settings) {
  const document = placeable?.document ?? placeable;
  if (!document?.setFlag) return;
  await document.setFlag(MODULE_ID, PLACEABLE_SETTINGS_FLAG, settings);
}

async function clearPlaceableSettings(placeable) {
  const document = placeable?.document ?? placeable;
  if (!document?.unsetFlag) return;
  await document.unsetFlag(MODULE_ID, PLACEABLE_SETTINGS_FLAG);
}

function refreshPlaceableIllumination(placeable) {
  if (!placeable) return;
  const settings = getPlaceableSettings(placeable);
  if (settings) {
    applyEffect(placeable, settings, false);
  } else {
    removeEffect(placeable);
  }
}

function refreshAllPlaceableIllumination() {
  const placeableGroups = [
    canvas?.tiles?.placeables,
    canvas?.drawings?.placeables,
    canvas?.walls?.placeables,
    canvas?.lighting?.placeables
  ];

  placeableGroups.forEach(group => {
    group?.forEach(placeable => {
      try {
        refreshPlaceableIllumination(placeable);
      } catch (err) {}
    });
  });
}

function getPlaceableLabel(placeable) {
  const rawName = placeable?.document?.documentName || placeable?.documentName || placeable?.constructor?.name || 'Object';
  return rawName.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function buildPlaceableSettingsDialogContent(placeable, settings) {
  const current = settings ?? normalizeEffectSettings();
  const customSymbol = escapeHtml(current.customSymbol || '');
  const effectOptions = AVAILABLE_EFFECTS.map(effect => {
    const selected = effect === current.effect ? 'selected' : '';
    const label = effect === 'none' ? 'None (Disabled)' : effect;
    return `<option value="${effect}" ${selected}>${label}</option>`;
  }).join('');
  const symbolOptions = AVAILABLE_SYMBOLS.map(symbol => {
    const selected = symbol === current.symbol ? 'selected' : '';
    return `<option value="${symbol}" ${selected}>${symbol}</option>`;
  }).join('');

  return `
    <form class="rnk-illumination-placeable-form">
      <div class="form-group">
        <label>Color</label>
        <input type="color" name="color" value="${escapeHtml(current.color)}">
      </div>
      <div class="form-group">
        <label>Effect</label>
        <select name="effect">${effectOptions}</select>
      </div>
      <div class="form-group">
        <label>Symbol</label>
        <select name="symbol">${symbolOptions}</select>
      </div>
      <div class="form-group">
        <label>Custom Symbol</label>
        <input type="text" name="customSymbol" value="${customSymbol}" placeholder="Image URL or path">
      </div>
      <div class="form-group">
        <label>Intensity</label>
        <input type="number" name="intensity" min="0.1" max="3.0" step="0.1" value="${escapeHtml(current.intensity)}">
      </div>
      <div class="form-group">
        <label>Range</label>
        <select name="range">
          ${AVAILABLE_RANGES.map(range => {
            const selected = Number(range) === Number(current.range) ? 'selected' : '';
            return `<option value="${range}" ${selected}>${range}px</option>`;
          }).join('')}
        </select>
      </div>
    </form>
  `;
}

function getDialogRoot(html) {
  return html instanceof HTMLElement ? html : (html?.[0] ?? html?.element ?? html);
}

function escapeHtml(value) {
  if (foundry.utils?.escapeHTML) return foundry.utils.escapeHTML(String(value ?? ''));
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function appendIlluminationButton(html, onClick, titleKey = 'rnk-illumination.ui.object.configure', iconClass = 'fa-sparkles') {
  const root = html instanceof HTMLElement ? html : (html[0] ?? html);
  if (!root || root.querySelector?.('[data-rnk-illumination-btn="true"]')) return;

  const btn = document.createElement('a');
  btn.classList.add('control-icon', 'rnk-illumination-object-btn');
  btn.dataset.rnkIlluminationBtn = 'true';
  btn.title = game.i18n.localize(titleKey);
  btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    onClick();
  });

  const selectors = ['.col.right', '.col.left', '.col', '.controls', 'form'];
  let inserted = false;
  for (const sel of selectors) {
    const container = root.querySelector(sel);
    if (container) {
      container.appendChild(btn);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    root.appendChild(btn);
  }
}

async function openPlaceableSettingsDialog(placeable, onDone = null) {
  const currentSettings = getPlaceableSettings(placeable) ?? normalizeEffectSettings();

  new Dialog({
    title: `${getPlaceableLabel(placeable)} ${game.i18n.localize('rnk-illumination.ui.object.dialogTitle')}`,
    content: buildPlaceableSettingsDialogContent(placeable, currentSettings),
    buttons: {
      save: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('rnk-illumination.ui.tile.save'),
        callback: async (html) => {
          const root = getDialogRoot(html);
          if (!root) return;

          const color = root.querySelector('[name="color"]')?.value?.trim() || DEFAULT_SETTINGS.color;
          const effect = root.querySelector('[name="effect"]')?.value?.trim() || DEFAULT_SETTINGS.effect;
          const symbol = root.querySelector('[name="symbol"]')?.value?.trim() || DEFAULT_SETTINGS.symbol;
          const customSymbol = root.querySelector('[name="customSymbol"]')?.value?.trim() || '';
          const intensity = Number.parseFloat(root.querySelector('[name="intensity"]')?.value) || DEFAULT_SETTINGS.intensity;
          const range = Number.parseInt(root.querySelector('[name="range"]')?.value, 10) || DEFAULT_SETTINGS.range;

          if (!/^#[0-9A-F]{6}$/i.test(color)) {
            ui.notifications.error('Invalid color format.');
            return;
          }
          if (!AVAILABLE_EFFECTS.includes(effect)) {
            ui.notifications.error('Invalid effect selection.');
            return;
          }
          if (!AVAILABLE_SYMBOLS.includes(symbol) && !customSymbol) {
            ui.notifications.error('Invalid symbol selection.');
            return;
          }
          if (intensity < 0.1 || intensity > 3.0) {
            ui.notifications.error('Intensity must be between 0.1 and 3.0.');
            return;
          }
          if (!AVAILABLE_RANGES.includes(range)) {
            ui.notifications.error('Invalid range selection.');
            return;
          }

          const settings = {
            color,
            effect,
            symbol: sanitizeSymbol(customSymbol || symbol),
            customSymbol,
            intensity,
            range
          };

          await setPlaceableSettings(placeable, settings);
          refreshPlaceableIllumination(placeable);
          if (typeof onDone === 'function') onDone();
        }
      },
      clear: {
        icon: '<i class="fas fa-trash"></i>',
        label: game.i18n.localize('rnk-illumination.ui.tile.clear'),
        callback: async () => {
          await clearPlaceableSettings(placeable);
          removeEffect(placeable);
          if (typeof onDone === 'function') onDone();
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize('rnk-illumination.ui.tile.cancel')
      }
    },
    default: 'save'
  }).render(true);
}

// -----------------------------------------------------------------------------
// GM Origin Token Helpers
// -----------------------------------------------------------------------------

/**
 * Return the token ID currently marked as the GM's origin for targeting.
 * @returns {string|null}
 */
function getGMOriginTokenId() {
  return game.settings.get(MODULE_ID, 'gmOriginTokenId');
}

/**
 * Set a specific token as the GM's origin for targeting. Passing null clears it.
 * @param {string|null} tokenId
 */
function setGMOriginTokenId(tokenId) {
  return game.settings.set(MODULE_ID, 'gmOriginTokenId', tokenId);
}

/**
 * Clear the GM origin token selection.
 */
function clearGMOriginToken() {
  return setGMOriginTokenId(null);
}

/**
 * Convenience accessor which returns the actual Token object (if present).
 * Will fall back to normal ownership lookup if no origin token is defined.
 * @param {User} user
 * @returns {Token|null}
 */
function getGMOriginToken(user) {
  if (!user || !user.isGM) return null;
  const id = getGMOriginTokenId();
  if (id && canvas?.tokens?.get(id)) return canvas.tokens.get(id);
  return null;
}


/**
 * Get the token that belongs to a specific user
 */
function getUserToken(user) {
  if (!user || !canvas?.tokens?.placeables) return null;

  // When the GM has explicitly chosen an origin token, always return it.
  if (user.isGM) {
    const originId = game.settings.get(MODULE_ID, 'gmOriginTokenId');
    if (originId) {
      const originToken = canvas.tokens.get(originId);
      if (originToken) return originToken;
    }
  }

  // If the user has been assigned a specific token in the Hub, use it.
  const assignedId = user.getFlag?.(MODULE_ID, 'assignedTokenId');
  if (assignedId) {
    const assignedToken = canvas.tokens.get(assignedId);
    if (assignedToken) return assignedToken;
  }

  // Find the token owned by this user (NOT the controlled token)
  // We need the user's own token, not the one they're controlling.
  return canvas.tokens.placeables.find(token => {
    const actor = token.actor;
    return actor?.testUserPermission(user, 'OWNER');
  }) || null;
}

configureTargetingLines({ getUserToken });

/**
 * Get the owner of a token
 */
function isCoGM(user) {
  if (!user) return false;
  return user.isGM || Boolean(user.getFlag && user.getFlag(MODULE_ID, 'coGM'));
}

function getTokenOwner(token) {
  if (!token) return null;

  // If the token has an assigned user, prefer that over ownership-derived user.
  const assignedId = (typeof token.getFlag === 'function')
    ? token.getFlag(MODULE_ID, 'assignedUserId')
    : token.document?.getFlag?.(MODULE_ID, 'assignedUserId');
  if (assignedId) {
    const assignedUser = game.users.get(assignedId);
    if (assignedUser) return assignedUser;
  }

  const actor = token.actor;
  if (!actor) return null;

  const owners = game.users.filter(u => actor.testUserPermission(u, 'OWNER'));

  // In multi-GM setups, check if any user has this actor set as their character.
  // This ensures each GM's token uses their own settings, not whoever comes first.
  const charOwner = owners.find(u => u.character && actor.id === u.character.id);
  if (charOwner) return charOwner;

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

function getHoveredToken() {
  if (!canvas?.tokens?.placeables) return null;
  return canvas.tokens.placeables.find(token => token.hover) || null;
}

async function assignTokenToUser(token, nextUserId) {
  if (!token) return;

  const tokenDocument = token.document ?? token;
  const previousUserId = tokenDocument.getFlag?.(MODULE_ID, 'assignedUserId') || null;

  if (previousUserId && previousUserId !== nextUserId) {
    const previousUser = game.users.get(previousUserId);
    if (previousUser) {
      await previousUser.setFlag(MODULE_ID, 'assignedTokenId', null);
    }
  }

  if (!nextUserId) {
    await tokenDocument.unsetFlag(MODULE_ID, 'assignedUserId');
    return;
  }

  const nextUser = game.users.get(nextUserId);
  if (!nextUser) return;

  const previousTokenId = nextUser.getFlag(MODULE_ID, 'assignedTokenId') || null;
  if (previousTokenId && previousTokenId !== token.id) {
    const previousToken = canvas.tokens.get(previousTokenId);
    const previousTokenDocument = previousToken?.document ?? previousToken;
    await previousTokenDocument?.unsetFlag?.(MODULE_ID, 'assignedUserId');
  }

  await nextUser.setFlag(MODULE_ID, 'assignedTokenId', token.id);
  await tokenDocument.setFlag(MODULE_ID, 'assignedUserId', nextUserId);
}

/**
 * Refresh illumination for a single token
 */
export function refreshTokenIllumination(token) {
  if (!token) return;
  const targetingUser = getTargetingUser(token);
  const tokenOwner = getTokenOwner(token);
  const isOwnerTargeting = tokenOwner && isUserTargeting(tokenOwner);
  const targetingVisualsEnabled = getTargetingVisualsEnabled();

  if (targetingUser || isOwnerTargeting) {
    const activeUser = targetingUser || tokenOwner;
    const settings = getUserSettings(activeUser.id);
    applyEffect(token, settings);
    if (targetingVisualsEnabled) {
      showTargetingIndicator(token, settings.color, settings.symbol);
    } else {
      hideTargetingIndicator(token);
    }
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
    name: 'rnk-illumination.keybindings.targetHovered.name',
    hint: 'rnk-illumination.keybindings.targetHovered.hint',
    editable: [{ key: 'KeyT', modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
    onDown: () => {
      const hoveredToken = getHoveredToken();
      if (hoveredToken) {
        hoveredToken.setTarget(!hoveredToken.isTargeted, { user: game.user });
      }
    }
  });

  // Register world settings before canvas hooks can read them.
  game.settings.register(MODULE_ID, 'gmOriginTokenId', {
    name: 'rnk-illumination.settings.gmOrigin.name',
    scope: 'world',
    config: false,
    default: null,
    type: String
  });

  game.settings.register(MODULE_ID, 'targetingEnabled', {
    name: 'rnk-illumination.settings.targetingEnabled.name',
    hint: 'rnk-illumination.settings.targetingEnabled.hint',
    scope: 'world',
    config: false,
    default: DEFAULT_TARGETING_ENABLED,
    type: Boolean
  });

  if (game.user?.isGM) {
    game.settings.registerMenu(MODULE_ID, 'gmHub', {
      name: 'rnk-illumination.ui.hub.title',
      label: 'rnk-illumination.ui.hub.open',
      hint: 'rnk-illumination.ui.hub.hint',
      icon: 'fas fa-palette',
      type: RNKGMHub,
      restricted: true
    });
  }
});

Hooks.on('ready', () => {
  if (canvas?.tokens?.placeables) refreshAllTokenIllumination();
  if (canvas?.tiles?.placeables) refreshAllPlaceableIllumination();
});

Hooks.on('canvasReady', () => {
  clearTargetingIndicators();
  clearTargetingLines();
  if (getTargetingVisualsEnabled()) {
    game.users.forEach(u => {
      u.targets.forEach(t => {
        const settings = getUserSettings(u.id);
        drawTargetingLine(u, t, settings.color, settings.symbol);
      });
    });
  }
  refreshAllTokenIllumination();
  refreshAllPlaceableIllumination();
});

Hooks.on('targetToken', (user, token, isTargeted) => {
  setTimeout(() => {
    refreshTokenIllumination(token);
    if (user) {
      const userToken = getUserToken(user);
      if (userToken) {
        refreshTokenIllumination(userToken);

        // Don't draw line to self
        if (userToken.id === token.id) return;

        const settings = getUserSettings(user.id);
        if (isTargeted && getTargetingVisualsEnabled()) {
          // Clear any old lines before drawing new one
          removeTargetingLine(user, token);
          drawTargetingLine(user, token, settings.color, settings.symbol);
        } else {
          removeTargetingLine(user, token);
        }
      }
    }
  }, 50);
});

Hooks.on('createToken', (tokenDoc) => {
  if (tokenDoc.object) refreshTokenIllumination(tokenDoc.object);
});

Hooks.on('createTile', (tileDoc) => {
  if (tileDoc.object) refreshPlaceableIllumination(tileDoc.object);
});

Hooks.on('createDrawing', (drawingDoc) => {
  if (drawingDoc.object) refreshPlaceableIllumination(drawingDoc.object);
});

Hooks.on('createWall', (wallDoc) => {
  if (wallDoc.object) refreshPlaceableIllumination(wallDoc.object);
});

Hooks.on('createAmbientLight', (lightDoc) => {
  if (lightDoc.object) refreshPlaceableIllumination(lightDoc.object);
});

Hooks.on('updateToken', (tokenDoc, changes) => {
  // Prefer the canvas token (up-to-date position) over the document's .object
  const token = canvas?.tokens?.get(tokenDoc.id) || tokenDoc.object;

  if (changes.actorLink || changes.actorId || changes.disposition) {
    if (token) refreshTokenIllumination(token);
  }

  // Update targeting lines when tokens move: clear immediately, redraw after
  // animation completes so lines appear at the final resting position.
  if ("x" in changes || "y" in changes || "elevation" in changes) {
    if (token) {
      clearTargetingLinesForToken(token);
      // Short delay to let the token arrive at its new position before redrawing.
      setTimeout(() => {
        const t = canvas?.tokens?.get(tokenDoc.id);
        if (t) updateTokenTargetingLines(t);
      }, 350);
    }
  }
});

Hooks.on('updateTile', (tileDoc) => {
  const tile = canvas?.tiles?.get(tileDoc.id) || tileDoc.object;
  if (tile) refreshPlaceableIllumination(tile);
});

Hooks.on('updateDrawing', (drawingDoc) => {
  const drawing = canvas?.drawings?.get(drawingDoc.id) || drawingDoc.object;
  if (drawing) refreshPlaceableIllumination(drawing);
});

Hooks.on('updateWall', (wallDoc) => {
  const wall = canvas?.walls?.get(wallDoc.id) || wallDoc.object;
  if (wall) refreshPlaceableIllumination(wall);
});

Hooks.on('updateAmbientLight', (lightDoc) => {
  const light = canvas?.lighting?.get(lightDoc.id) || lightDoc.object;
  if (light) refreshPlaceableIllumination(light);
});

// When a token drag starts, clear its lines so they don't stick at old positions.
// Lines are redrawn in the updateToken hook after animation completes.
Hooks.on('preUpdateToken', (tokenDoc, changes) => {
  if ("x" in changes || "y" in changes) {
    const token = canvas?.tokens?.get(tokenDoc.id) || tokenDoc.object;
    if (token) clearTargetingLinesForToken(token);
  }
});

Hooks.on('refreshToken', (token) => {
  refreshTokenIllumination(token);
});

Hooks.on('refreshTile', (tile) => {
  refreshPlaceableIllumination(tile);
});

Hooks.on('refreshDrawing', (drawing) => {
  refreshPlaceableIllumination(drawing);
});

Hooks.on('refreshWall', (wall) => {
  refreshPlaceableIllumination(wall);
});

Hooks.on('refreshAmbientLight', (light) => {
  refreshPlaceableIllumination(light);
});

Hooks.on('deleteToken', (tokenDoc) => {
  if (tokenDoc.object) {
    removeEffect(tokenDoc.object);
    hideTargetingIndicator(tokenDoc.object);
    clearTargetingLinesForToken(tokenDoc.object);
  }
  // If the token being removed was remembered as the GM origin, clear the
  // setting so we don't point at a non-existent token later.
  const originId = getGMOriginTokenId();
  if (originId && tokenDoc.id === originId) {
    clearGMOriginToken();
  }
});

Hooks.on('deleteTile', (tileDoc) => {
  if (tileDoc.object) {
    removeEffect(tileDoc.object);
    clearPlaceableSettings(tileDoc.object).catch(() => {});
  }
});

Hooks.on('deleteDrawing', (drawingDoc) => {
  if (drawingDoc.object) {
    removeEffect(drawingDoc.object);
    clearPlaceableSettings(drawingDoc.object).catch(() => {});
  }
});

Hooks.on('deleteWall', (wallDoc) => {
  if (wallDoc.object) {
    removeEffect(wallDoc.object);
    clearPlaceableSettings(wallDoc.object).catch(() => {});
  }
});

Hooks.on('deleteAmbientLight', (lightDoc) => {
  if (lightDoc.object) {
    removeEffect(lightDoc.object);
    clearPlaceableSettings(lightDoc.object).catch(() => {});
  }
});

// Add a little toggle button to the token HUD for GMs to mark the origin
// token used when drawing targeting lines.  The button appears on tokens
// that have no player owners (NPCs).
Hooks.on('renderTokenHUD', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  // Foundry V13/V14 token HUDs expose the placeable on app.object.
  const token = app.object ?? app.token;
  if (!token || !token.actor) return;
  if (token.actor.hasPlayerOwner) return;

  const originId = getGMOriginTokenId();
  const isActive = originId === token.id;
  const titleKey = isActive ? "rnk-illumination.ui.token.originButtonActive" : "rnk-illumination.ui.token.originButton";

  // Create button as a native DOM element so it works cleanly in v13/v14.
  const btn = document.createElement('a');
  btn.classList.add('control-icon', 'rnk-origin-btn');
  if (isActive) btn.classList.add('active');
  btn.title = game.i18n.localize(titleKey);
  btn.innerHTML = '<i class="fas fa-crosshairs"></i>';

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (isActive) {
      clearGMOriginToken();
    } else {
      setGMOriginTokenId(token.id);
    }
    canvas.tokens.placeables.forEach(t => t.hud?.render());
    refreshAllTokenIllumination();
    clearTargetingLines();
    if (getTargetingVisualsEnabled()) {
      game.users.forEach(u => {
        u.targets.forEach(t => {
          const settings = getUserSettings(u.id);
          drawTargetingLine(u, t, settings.color, settings.symbol);
        });
      });
    }
  });

  // Assign this token to a specific user (GM/Co-GM or player)
  const assignBtn = document.createElement('a');
  assignBtn.classList.add('control-icon', 'rnk-assign-btn');
  assignBtn.title = game.i18n.localize('rnk-illumination.ui.token.assignButton');
  assignBtn.innerHTML = '<i class="fas fa-user-tag"></i>';
  assignBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const currentAssign = token.getFlag(MODULE_ID, 'assignedUserId') || '';
    const options = [
      { value: '', label: game.i18n.localize('rnk-illumination.ui.token.assignNone') }
    ].concat(
      game.users.map(u => ({
        value: u.id,
        label: `${u.name}${u.isGM ? ` (${game.i18n.localize('rnk-illumination.ui.roles.gmShort')})` : ''}`
      }))
    );

    const content = `
      <div class="form-group">
        <label>${game.i18n.localize('rnk-illumination.ui.token.assignPrompt')}</label>
        <select id="rnk-assign-user" style="width: 100%;">
          ${options.map(o => `<option value="${o.value}" ${o.value === currentAssign ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;

    new Dialog({
      title: game.i18n.localize('rnk-illumination.ui.token.assignDialogTitle'),
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('rnk-illumination.ui.token.assignConfirm'),
          callback: async (html) => {
            const selectedElement = html?.find
              ? html.find('#rnk-assign-user')[0]
              : html?.querySelector?.('#rnk-assign-user');
            const selected = selectedElement?.value || '';
            await assignTokenToUser(token, selected || null);
            refreshAllTokenIllumination();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('rnk-illumination.ui.token.assignCancel')
        }
      },
      default: 'confirm'
    }).render(true);
  });

  // Resolve the root element whether the hook passes a jQuery wrapper or native element.
  const root = html instanceof HTMLElement ? html : (html[0] ?? html);
  const selectors = ['.col.right', '.col.left', '.col', '.controls'];
  let inserted = false;
  for (const sel of selectors) {
    const container = root.querySelector(sel);
    if (container) {
      container.appendChild(btn);
      container.appendChild(assignBtn);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    root.appendChild(btn);
    root.appendChild(assignBtn);
  }
});

// Add a tile HUD button so GMs and Co-GMs can assign a unique illumination
// profile directly on the scene object.
Hooks.on('renderTileHUD', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  const tile = app.object ?? app.tile;
  if (!tile) return;
  appendIlluminationButton(html, () => openPlaceableSettingsDialog(tile), 'rnk-illumination.ui.tile.configure');
});

Hooks.on('renderDrawingHUD', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  const drawing = app.object ?? app.drawing;
  if (!drawing) return;
  appendIlluminationButton(html, () => openPlaceableSettingsDialog(drawing), 'rnk-illumination.ui.tile.configure');
});

Hooks.on('renderWallConfig', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  const wall = app.object ?? app.document?.object ?? app.document;
  if (!wall) return;
  appendIlluminationButton(html, () => openPlaceableSettingsDialog(wall), 'rnk-illumination.ui.object.configure');
});

Hooks.on('renderAmbientLightConfig', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  const light = app.object ?? app.document?.object ?? app.document;
  if (!light) return;
  appendIlluminationButton(html, () => openPlaceableSettingsDialog(light), 'rnk-illumination.ui.object.configure');
});

Hooks.on('canvasTearDown', () => {
  if (canvas?.tokens?.placeables) {
    canvas.tokens.placeables.forEach(token => {
      removeEffect(token);
      hideTargetingIndicator(token);
    });
  }
  if (canvas?.tiles?.placeables) {
    canvas.tiles.placeables.forEach(tile => {
      removeEffect(tile);
    });
  }
  if (canvas?.drawings?.placeables) {
    canvas.drawings.placeables.forEach(drawing => {
      removeEffect(drawing);
    });
  }
  clearTargetingIndicators();
  clearTargetingLines();
});

// Button Registration Standard
Hooks.on('getSceneControlButtons', (controls) => {
  if (!controls) return controls;
  if (!isCoGM(game.user)) return controls;
  const controlData = {
    name: MODULE_ID,
    title: game.i18n.localize('rnk-illumination.ui.controls.title'),
    icon: 'fa-solid fa-sun',
    order: 99999,
    layer: 'controls',
    visible: true,
    tools: [
      {
        name: 'illumination-hub',
        title: game.i18n.localize('rnk-illumination.ui.hub.open'),
        icon: 'fa-solid fa-palette',
        onChange: (active) => {
          if (!active) return;
          openIlluminationHub();
        },
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
  if (!isCoGM(game.user)) return;
  const root = html instanceof HTMLElement ? html : (html?.[0] ?? html?.element ?? html);
  const button = root?.querySelector?.(`[data-control="${MODULE_ID}"]`) ||
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

// Global exposure
globalThis.refreshAllTokenIllumination = refreshAllTokenIllumination;
globalThis.refreshAllPlaceableIllumination = refreshAllPlaceableIllumination;
globalThis.openIlluminationHub = openIlluminationHub;
globalThis.openIlluminationObjectDialog = (placeable, onDone) => openPlaceableSettingsDialog(placeable, onDone);
globalThis.RNKGMHub = RNKGMHub;
