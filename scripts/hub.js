/**
 * RNK™ Illumination - Hub Interface
 */

import { AVAILABLE_EFFECTS, AVAILABLE_RANGES, AVAILABLE_SYMBOLS, DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { sanitizeColor } from './effects.js';
import { isValidSymbol, sanitizeSymbol } from './targeting.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Check if a user is GM or Co-GM (standalone for use in static methods)
 */
function isCoGM(user) {
  if (!user) return false;
  return user.isGM || Boolean(user.getFlag && user.getFlag(MODULE_ID, 'coGM'));
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
      ui.notifications.warn('Only the GM or a designated Co-GM can open the Illumination Hub.');
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
      name: `${t.name} (${t.actor?.name ?? 'No Actor'})`
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
    
    const btns = this.element.querySelectorAll('.rnk-upload-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = btn.dataset.target;

        if (typeof FilePicker !== 'function') {
          ui.notifications.error('FilePicker is not available in this environment.');
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
  }

  static async _onSubmit(event, form, formData) {
    console.log('RNK™ Illumination | Form submitted');
    
    if (!isCoGM(game.user)) {
      ui.notifications.error("Only the GM or a designated Co-GM can modify player settings");
      return;
    }

    // Disable the submit button to prevent multiple submissions
    const submitButton = this.element?.querySelector('.rnk-illumination-save');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
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

      // Allow the GM to pin a specific token to themselves for consistent origin.
      const gmAssignedToken = data.gmToken || null;
      await game.user.setFlag(MODULE_ID, 'assignedTokenId', gmAssignedToken);

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
        await user.setFlag(MODULE_ID, 'assignedTokenId', coAssignedToken || null);

        if (coAssignedToken) {
          const token = canvas.tokens.get(coAssignedToken);
          if (token && token.document) {
            await token.document.setFlag(MODULE_ID, 'assignedUserId', user.id);
          }
        } else {
          const lastAssigned = user.getFlag(MODULE_ID, 'assignedTokenId');
          if (lastAssigned) {
            const token = canvas.tokens.get(lastAssigned);
            if (token && token.document) {
              await token.document.unsetFlag(MODULE_ID, 'assignedUserId');
            }
          }
        }
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
        await user.setFlag(MODULE_ID, 'assignedTokenId', assignedToken || null);

        // If a token was assigned, write it to the token itself so illumination
        // uses the correct owner/setting regardless of ownership.
        if (assignedToken) {
          const token = canvas.tokens.get(assignedToken);
          if (token && token.document) {
            await token.document.setFlag(MODULE_ID, 'assignedUserId', user.id);
          }
        } else {
          // Clear any assignment from previous selections
          const lastAssigned = user.getFlag(MODULE_ID, 'assignedTokenId');
          if (lastAssigned) {
            const token = canvas.tokens.get(lastAssigned);
            if (token && token.document) {
              await token.document.unsetFlag(MODULE_ID, 'assignedUserId');
            }
          }
        }
      }

      ui.notifications.info("GM and player settings updated");
      console.log('RNK™ Illumination | Settings saved successfully');
      setTimeout(() => {
        try {
          if (globalThis.refreshAllTokenIllumination) globalThis.refreshAllTokenIllumination();
        } catch (e) {}
      }, 100);
      // Re-enable the save button
      const saveButton = this.element?.querySelector('button[type="submit"]');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Settings";
      }
    } catch (err) {
      console.error("RNK™ Illumination | Failed to save settings", err);
      ui.notifications.error("Failed to save illumination settings. Check console for details.");
      // Re-enable the save button on error
      const saveButton = this.element?.querySelector('button[type="submit"]');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Settings";
      }
    }
  }
}

/**
 * Open the GM illumination hub (GM only)
 */
export function openIlluminationHub() {
  if (!game.user?.isGM) {
    ui.notifications.error("Only Game Masters can access the Illumination Hub");
    return;
  }
  new RNKGMHub().render({ force: true });
}
