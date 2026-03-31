/**
 * RNK™ Illumination Module
 * Advanced token illumination with custom underglow effects and hubs.
 */

import { DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
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
    symbol: raw.symbol || DEFAULT_SETTINGS.symbol,
    intensity: raw.intensity || DEFAULT_SETTINGS.intensity,
    range: raw.range || DEFAULT_SETTINGS.range
  };
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
});

Hooks.on('ready', () => {
  // register the hidden setting that tracks which token the GM has chosen as
  // the active origin for targeting lines.
  game.settings.register(MODULE_ID, 'gmOriginTokenId', {
    name: 'rnk-illumination.settings.gmOrigin.name',
    scope: 'world',
    config: false,
    default: null,
    type: String
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
  if (canvas?.tokens?.placeables) refreshAllTokenIllumination();
});

Hooks.on('canvasReady', () => {
  clearTargetingIndicators();
  refreshAllTokenIllumination();
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
        if (isTargeted) {
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

// Add a little toggle button to the token HUD for GMs to mark the origin
// token used when drawing targeting lines.  The button appears on tokens
// that have no player owners (NPCs).
Hooks.on('renderTokenHUD', (app, html, data) => {
  if (!isCoGM(game.user)) return;

  // V13 uses app.object, older versions use app.token
  const token = app.object ?? app.token;
  if (!token || !token.actor) return;
  if (token.actor.hasPlayerOwner) return;

  const originId = getGMOriginTokenId();
  const isActive = originId === token.id;
  const titleKey = isActive ? "rnk-illumination.ui.token.originButtonActive" : "rnk-illumination.ui.token.originButton";

  // Create button as a native DOM element (works in both V12 jQuery and V13 native)
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
    game.users.forEach(u => {
      u.targets.forEach(t => {
        const settings = getUserSettings(u.id);
        drawTargetingLine(u, t, settings.color, settings.symbol);
      });
    });
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

  // Resolve the root element whether html is jQuery or a native element
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
globalThis.openIlluminationHub = openIlluminationHub;
globalThis.RNKGMHub = RNKGMHub;
