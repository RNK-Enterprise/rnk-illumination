/**
 * RNK™ Illumination - Hub Interface
 */

import {
  AVAILABLE_EFFECTS,
  AVAILABLE_RANGES,
  AVAILABLE_SYMBOLS,
  DEFAULT_SETTINGS,
  DEFAULT_TARGETING_ENABLED,
  MODULE_ID
} from './constants.js';
import { sanitizeColor } from './effects.js';
import { isValidSymbol, sanitizeSymbol } from './targeting.js';
import { clearTargetingLines, drawTargetingLine } from './targeting-lines.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function localize(key) {
  return game.i18n.localize(key);
}

async function syncAssignedToken(user, nextTokenId) {
  const previousTokenId = user.getFlag(MODULE_ID, 'assignedTokenId') || null;
  if (previousTokenId && previousTokenId !== nextTokenId) {
    const previousToken = canvas.tokens.get(previousTokenId);
    if (previousToken?.document) {
      await previousToken.document.unsetFlag(MODULE_ID, 'assignedUserId');
    }
  }

  await user.setFlag(MODULE_ID, 'assignedTokenId', nextTokenId || null);

  if (nextTokenId) {
    const token = canvas.tokens.get(nextTokenId);
    if (token?.document) {
      await token.document.setFlag(MODULE_ID, 'assignedUserId', user.id);
    }
  }
}

/**
 * Check if a user is GM or Co-GM (standalone for use in static methods)
 */
function isCoGM(user) {
  if (!user) return false;
  return user.isGM || Boolean(user.getFlag && user.getFlag(MODULE_ID, 'coGM'));
}

function getUserTargetingSettings(user) {
  const raw = user?.getFlag?.(MODULE_ID, 'settings') || {};
  const customSymbol = typeof raw.customSymbol === 'string' ? raw.customSymbol.trim() : '';
  return {
    color: sanitizeColor(raw.color || DEFAULT_SETTINGS.color),
    symbol: sanitizeSymbol(customSymbol || raw.symbol || DEFAULT_SETTINGS.symbol)
  };
}

function getPlaceableSettings(placeable) {
  const raw = placeable?.document?.getFlag?.(MODULE_ID, 'illuminationSettings') ||
    placeable?.getFlag?.(MODULE_ID, 'illuminationSettings');
  if (!raw) return null;

  const customSymbol = typeof raw.customSymbol === 'string' ? raw.customSymbol.trim() : '';
  return {
    color: sanitizeColor(raw.color || DEFAULT_SETTINGS.color),
    effect: AVAILABLE_EFFECTS.includes(raw.effect) ? raw.effect : DEFAULT_SETTINGS.effect,
    symbol: sanitizeSymbol(customSymbol || raw.symbol || DEFAULT_SETTINGS.symbol),
    customSymbol,
    intensity: Number.parseFloat(raw.intensity) || DEFAULT_SETTINGS.intensity,
    range: Number.parseInt(raw.range, 10) || DEFAULT_SETTINGS.range
  };
}

function getObjectLayerLabel(layerKey) {
  switch (layerKey) {
    case 'tiles': return 'Tile';
    case 'drawings': return 'Drawing';
    case 'walls': return 'Wall';
    case 'lighting': return 'Ambient Light';
    default: return 'Object';
  }
}

function getConfiguredObjects() {
  const layers = [
    ['tiles', canvas?.tiles?.placeables],
    ['drawings', canvas?.drawings?.placeables],
    ['walls', canvas?.walls?.placeables],
    ['lighting', canvas?.lighting?.placeables]
  ];

  return layers.flatMap(([layerKey, placeables]) => {
    if (!Array.isArray(placeables)) return [];
    return placeables.map(placeable => {
      const settings = getPlaceableSettings(placeable);
      if (!settings) return null;
      return {
        id: placeable.id,
        layerKey,
        layerLabel: getObjectLayerLabel(layerKey),
        name: placeable.name || placeable.document?.name || placeable.document?.documentName || placeable.id,
        settings,
        color: settings.color,
        effect: settings.effect,
        symbol: settings.symbol,
        intensity: settings.intensity,
        range: settings.range
      };
    }).filter(Boolean);
  });
}

/**
 * GM Illumination Hub - ApplicationV2
 */
export class RNKGMHub extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    id: 'rnk-gm-hub',
    tag: 'form',
    window: {
      icon: 'fa-solid fa-crown',
      title: 'RNK™ GM Illumination Hub',
      resizable: true,
      minimizable: true
    },
    position: {
      width: 600,
      height: 500
    },
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: { template: 'modules/rnk-illumination/templates/gm-hub.html' }
  };

  /**
   * Open the hub application
   */
  _isCoGM(user) {
    return user?.isGM || (user?.getFlag && user.getFlag(MODULE_ID, 'coGM'));
  }

  open() {
    if (!this._isCoGM(game.user)) {
      ui.notifications.warn(localize('rnk-illumination.notifications.hubAccessWarn'));
      return;
    }
    this.render({ force: true });
  }

  async _prepareContext(_options) {
    if (!game.user) {
      return {
        gmUsers: [],
        users: [],
        gmSettings: { ...DEFAULT_SETTINGS },
        targetingEnabled: DEFAULT_TARGETING_ENABLED,
        configuredObjects: [],
        effects: AVAILABLE_EFFECTS,
        symbols: AVAILABLE_SYMBOLS,
        ranges: AVAILABLE_RANGES
      };
    }

    const gmUsers = game.users
      .filter(u => this._isCoGM(u))
      .map(user => {
        const s = user.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          color: sanitizeColor(user.color),
          isGM: user.isGM,
          isCoGM: !user.isGM && this._isCoGM(user),
          settingsColor: sanitizeColor(s.color)
        };
      });

    // Other admin users (not the current user) with full settings for their own control rows.
    // Includes both actual Foundry GMs and players promoted to Co-GM via module flag.
    const coGMUsers = game.users
      .filter(u => u.id !== game.user.id && this._isCoGM(u))
      .map(user => {
        const settings = user.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          assignedToken: user.getFlag(MODULE_ID, 'assignedTokenId') || '',
          settings: {
            color: sanitizeColor(settings.color),
            effect: settings.effect || DEFAULT_SETTINGS.effect,
            symbol: sanitizeSymbol(settings.symbol),
            intensity: settings.intensity || DEFAULT_SETTINGS.intensity,
            range: settings.range || DEFAULT_SETTINGS.range,
            customSymbol: settings.customSymbol || ''
          }
        };
      });

    const tokens = canvas?.tokens?.placeables?.map(t => ({
      id: t.id,
      name: `${t.name} (${t.actor?.name ?? localize('rnk-illumination.ui.hub.noActor')})`
    })) || [];

    const isCurrentUserGM = game.user.isGM;
    // Regular users: exclude current user AND Co-GMs (they get their own section)
    const coGMIds = new Set(coGMUsers.map(u => u.id));
    const users = game.users
      .filter(u => u.id !== game.user.id && !coGMIds.has(u.id))
      .map(user => {
        const settings = user.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          color: sanitizeColor(user.color),
          isGM: user.isGM,
          isCoGM: !user.isGM && this._isCoGM(user),
          assignedToken: user.getFlag(MODULE_ID, 'assignedTokenId') || '',
          settings: {
            color: sanitizeColor(settings.color),
            effect: settings.effect || DEFAULT_SETTINGS.effect,
            symbol: sanitizeSymbol(settings.symbol),
            intensity: settings.intensity || DEFAULT_SETTINGS.intensity,
            range: settings.range || DEFAULT_SETTINGS.range,
            customSymbol: settings.customSymbol || ''
          }
        };
      });

    const gmUser = game.user;
    const gmSettings = gmUser.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
    const gmAssignedToken = gmUser.getFlag(MODULE_ID, 'assignedTokenId') || '';
    const configuredObjects = getConfiguredObjects();

    return {
      gm: {
        id: gmUser.id,
        name: gmUser.name,
        avatar: gmUser.avatar,
        color: sanitizeColor(gmUser.color),
        isGM: gmUser.isGM,
        isCoGM: !gmUser.isGM && this._isCoGM(gmUser),
        assignedToken: gmAssignedToken
      },
      targetingEnabled: game.settings.get(MODULE_ID, 'targetingEnabled') ?? DEFAULT_TARGETING_ENABLED,
      configuredObjects,
      gmUsers: gmUsers,
      coGMUsers: coGMUsers,
      users: users,
      tokens: tokens,
      isCurrentUserGM: isCurrentUserGM,
      gmSettings: {
        color: sanitizeColor(gmSettings.color),
        effect: gmSettings.effect || DEFAULT_SETTINGS.effect,
        symbol: sanitizeSymbol(gmSettings.symbol),
        intensity: gmSettings.intensity || DEFAULT_SETTINGS.intensity,
        range: gmSettings.range || DEFAULT_SETTINGS.range,
        customSymbol: gmSettings.customSymbol || ''
      },
      effects: AVAILABLE_EFFECTS,
      symbols: AVAILABLE_SYMBOLS,
      ranges: AVAILABLE_RANGES
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const app = this;
    const objectFilterState = this._objectBrowserState ?? { query: '', layer: 'all' };
    this._objectBrowserState = objectFilterState;
    
    const btns = this.element.querySelectorAll('.rnk-upload-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = btn.dataset.target;

        if (typeof FilePicker !== 'function') {
          ui.notifications.error(localize('rnk-illumination.notifications.filePickerUnavailable'));
          this.element.querySelector(`[name="${target}"]`).focus();
          return;
        }

        try {
          const value = await new Promise(resolve => {
            const fp = new FilePicker({ type: "image", callback: (path) => resolve(path) });
            fp.browse();
          });
          if (value) {
            const input = this.element.querySelector(`[name="${target}"]`);
            input.value = value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch (err) {
          console.error('RNK™ Illumination | Upload handler error', err);
        }
      });
    });

    const resolvePlaceable = (layerKey, objectId) => canvas?.[layerKey]?.get?.(objectId) ||
      canvas?.[layerKey]?.placeables?.find(placeable => placeable.id === objectId) ||
      null;

    this.element.querySelectorAll('[data-rnk-illumination-object-edit]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const layerKey = btn.dataset.layer;
        const objectId = btn.dataset.objectId;
        const placeable = resolvePlaceable(layerKey, objectId);
        if (!placeable) {
          ui.notifications.warn(localize('rnk-illumination.notifications.objectNotFound'));
          return;
        }
        if (typeof globalThis.openIlluminationObjectDialog === 'function') {
          globalThis.openIlluminationObjectDialog(placeable, () => app.render({ force: true }));
        }
      });
    });

    this.element.querySelectorAll('[data-rnk-illumination-object-clear]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const layerKey = btn.dataset.layer;
        const objectId = btn.dataset.objectId;
        const placeable = resolvePlaceable(layerKey, objectId);
        if (!placeable?.document?.unsetFlag) return;
        await placeable.document.unsetFlag(MODULE_ID, 'illuminationSettings');
        if (typeof globalThis.refreshAllPlaceableIllumination === 'function') {
          globalThis.refreshAllPlaceableIllumination();
        }
        app.render({ force: true });
      });
    });

    const searchInput = this.element.querySelector('.rnk-illumination-object-search');
    const layerFilter = this.element.querySelector('.rnk-illumination-object-layer-filter');
    const objectCards = Array.from(this.element.querySelectorAll('.rnk-object-card'));
    const countLabel = this.element.querySelector('.rnk-illumination-toolbar-count');

    if (searchInput) searchInput.value = objectFilterState.query;
    if (layerFilter) layerFilter.value = objectFilterState.layer;

    const applyObjectFilters = () => {
      const query = (searchInput?.value || '').trim().toLowerCase();
      const layer = layerFilter?.value || 'all';
      objectFilterState.query = query;
      objectFilterState.layer = layer;

      let visibleCount = 0;
      objectCards.forEach(card => {
        const name = (card.dataset.objectName || '').toLowerCase();
        const cardLayer = card.dataset.objectLayer || '';
        const effect = (card.dataset.objectEffect || '').toLowerCase();
        const matchesQuery = !query || name.includes(query) || effect.includes(query) || cardLayer.includes(query);
        const matchesLayer = layer === 'all' || cardLayer === layer;
        const visible = matchesQuery && matchesLayer;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      if (countLabel) {
        countLabel.textContent = `${visibleCount} ${game.i18n.localize('rnk-illumination.ui.hub.objectCount')}`;
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', applyObjectFilters);
    }
    if (layerFilter) {
      layerFilter.addEventListener('change', applyObjectFilters);
    }
    applyObjectFilters();
  }

  static async _onSubmit(event, form, formData) {
    console.log('RNK™ Illumination | Form submitted');

    const formElement = form instanceof HTMLFormElement ? form : event?.currentTarget;
    
    if (!isCoGM(game.user)) {
      ui.notifications.error(localize('rnk-illumination.notifications.hubSubmitDenied'));
      return;
    }

    // Disable the submit button to prevent multiple submissions
    const submitButton = formElement?.querySelector('.rnk-illumination-save');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = localize('rnk-illumination.ui.hub.saving');
    }

    try {
      const data = formData.object;
      const gmColor = data.gmColor;
      const gmEffect = data.gmEffect;
      const gmIntensity = parseFloat(data.gmIntensity) || DEFAULT_SETTINGS.intensity;
      const gmRange = parseInt(data.gmRange) || DEFAULT_SETTINGS.range;
      const gmCustomSymbol = (data.gmCustomSymbol || '').trim();
      let gmSymbol = gmCustomSymbol || data.gmSymbol || DEFAULT_SETTINGS.symbol;

      if (!/^#[0-9A-F]{6}$/i.test(gmColor)) {
        throw new Error("Invalid GM color format");
      }
      if (!AVAILABLE_EFFECTS.includes(gmEffect)) {
        throw new Error("Invalid GM effect");
      }
      if (!isValidSymbol(gmSymbol)) {
        throw new Error("Invalid GM symbol");
      }
      if (gmIntensity < 0.1 || gmIntensity > 3.0) {
        throw new Error("GM intensity must be between 0.1 and 3.0");
      }
      if (!AVAILABLE_RANGES.includes(gmRange)) {
        throw new Error("Invalid GM range");
      }
      const gmSettings = { 
        color: gmColor, 
        effect: gmEffect, 
        symbol: gmSymbol,
        intensity: gmIntensity,
        range: gmRange
      };
      await game.user.setFlag(MODULE_ID, 'settings', gmSettings);
      const gmAssignedToken = data.gmToken || null;
      await syncAssignedToken(game.user, gmAssignedToken);
      const targetingEnabled = Boolean(data.targetingEnabled);
      await game.settings.set(MODULE_ID, 'targetingEnabled', targetingEnabled);

      clearTargetingLines();
      if (targetingEnabled) {
        game.users.forEach(user => {
          user.targets.forEach(target => {
            const settings = getUserTargetingSettings(user);
            drawTargetingLine(user, target, settings.color, settings.symbol);
          });
        });
      }

      // Save Co-GM settings from their dedicated control rows
      const coGMUserObjs = game.users.filter(u => u.id !== game.user.id && isCoGM(u));
      const coGMIdSet = new Set();
      for (const user of coGMUserObjs) {
        const coColor = data[`coGM_${user.id}_color`];
        if (!coColor) continue; // no form fields for this user
        coGMIdSet.add(user.id);

        const coEffect = data[`coGM_${user.id}_effect`];
        const coIntensity = parseFloat(data[`coGM_${user.id}_intensity`]) || DEFAULT_SETTINGS.intensity;
        const coRange = parseInt(data[`coGM_${user.id}_range`]) || DEFAULT_SETTINGS.range;
        const coCustomSymbol = (data[`coGM_${user.id}_customSymbol`] || '').trim();
        const coSymbol = coCustomSymbol || data[`coGM_${user.id}_symbol`] || DEFAULT_SETTINGS.symbol;
        const coAssignedToken = data[`coGM_${user.id}_token`] || '';

        if (!/^#[0-9A-F]{6}$/i.test(coColor)) {
          throw new Error(`Invalid color format for Co-GM ${user.name}`);
        }
        if (!AVAILABLE_EFFECTS.includes(coEffect)) {
          throw new Error(`Invalid effect for Co-GM ${user.name}`);
        }
        if (!isValidSymbol(coSymbol)) {
          throw new Error(`Invalid symbol for Co-GM ${user.name}`);
        }
        if (coIntensity < 0.1 || coIntensity > 3.0) {
          throw new Error(`Intensity out of range for Co-GM ${user.name}`);
        }
        if (!AVAILABLE_RANGES.includes(coRange)) {
          throw new Error(`Invalid range for Co-GM ${user.name}`);
        }

        const coSettings = {
          color: coColor,
          effect: coEffect,
          symbol: coSymbol,
          intensity: coIntensity,
          range: coRange,
          customSymbol: coCustomSymbol || ''
        };

        await user.setFlag(MODULE_ID, 'settings', coSettings);
        await syncAssignedToken(user, coAssignedToken || null);
      }

      // Only the actual GM can promote/demote Co-GMs.
      const currentUserIsGM = game.user?.isGM;

      // Regular users (skip Co-GMs already handled above)
      const editableUsers = (currentUserIsGM ? game.users.filter(u => u.id !== game.user.id) : [game.user])
        .filter(u => !coGMIdSet.has(u.id));

      for (const user of editableUsers) {
        const color = data[`${user.id}_color`];
        const effect = data[`${user.id}_effect`];
        const intensity = parseFloat(data[`${user.id}_intensity`]) || DEFAULT_SETTINGS.intensity;
        const range = parseInt(data[`${user.id}_range`]) || DEFAULT_SETTINGS.range;
        const customSymbol = (data[`${user.id}_customSymbol`] || '').trim();
        const symbol = customSymbol || data[`${user.id}_symbol`];
        const assignedToken = data[`token_${user.id}`] || '';
        const coGM = currentUserIsGM ? Boolean(data[`coGM_${user.id}`]) : (user.getFlag(MODULE_ID, 'coGM') || false);

        if (!/^#[0-9A-F]{6}$/i.test(color)) {
          throw new Error(`Invalid color format for user ${user.name}`);
        }
        if (!AVAILABLE_EFFECTS.includes(effect)) {
          throw new Error(`Invalid effect for user ${user.name}`);
        }
        if (!isValidSymbol(symbol)) {
          throw new Error(`Invalid symbol for user ${user.name}`);
        }
        if (intensity < 0.1 || intensity > 3.0) {
          throw new Error(`Intensity out of range for user ${user.name}`);
        }
        if (!AVAILABLE_RANGES.includes(range)) {
          throw new Error(`Invalid range for user ${user.name}`);
        }

        const settings = {
          color: color,
          effect: effect,
          symbol: symbol,
          intensity: intensity,
          range: range,
          customSymbol: customSymbol || ''
        };

        await user.setFlag(MODULE_ID, 'settings', settings);
        await user.setFlag(MODULE_ID, 'coGM', coGM);
        await syncAssignedToken(user, assignedToken || null);
      }

      ui.notifications.info(localize('rnk-illumination.notifications.settingsUpdated'));
      console.log('RNK™ Illumination | Settings saved successfully');
      setTimeout(() => {
        try {
          if (globalThis.refreshAllTokenIllumination) globalThis.refreshAllTokenIllumination();
        } catch (e) {}
      }, 100);
      // Re-enable the save button
      const saveButton = formElement?.querySelector('button[type="submit"]');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = localize('rnk-illumination.ui.hub.saveAll');
      }
    } catch (err) {
      console.error("RNK™ Illumination | Failed to save settings", err);
      ui.notifications.error(localize('rnk-illumination.notifications.settingsSaveFailed'));
      // Re-enable the save button on error
      const saveButton = formElement?.querySelector('button[type="submit"]');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = localize('rnk-illumination.ui.hub.saveAll');
      }
    }
  }
}

/**
 * Open the illumination hub for a GM or designated Co-GM.
 */
export function openIlluminationHub() {
  if (!isCoGM(game.user)) {
    ui.notifications.error(localize('rnk-illumination.notifications.hubAccessDenied'));
    return;
  }
  new RNKGMHub().open();
}
