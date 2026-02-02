/**
 * RNK™ Illumination - Hub Interface
 */

import { AVAILABLE_EFFECTS, AVAILABLE_SYMBOLS, DEFAULT_SETTINGS, MODULE_ID } from './constants.js';
import { sanitizeColor } from './effects-Wohdan.js';

// Simple symbol validation functions
function sanitizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return 'star';
  if (AVAILABLE_SYMBOLS?.includes(symbol)) return symbol;
  return 'star';
}

function isValidSymbol(symbol) {
  return AVAILABLE_SYMBOLS?.includes(symbol) || false;
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
      handler: RNKGMHub.#onSubmit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: { template: 'modules/rnk-illumination/templates/gm-hub.html' }
  };

  /**
   * Open the hub application
   */
  open() {
    if (!game.user.isGM) {
      ui.notifications.warn('Only the GM can open the Illumination Hub.');
      return;
    }
    this.render(true);
  }

  async _prepareContext(_options) {
    if (!game.user) {
      return {
        users: [],
        gmSettings: { ...DEFAULT_SETTINGS },
        effects: AVAILABLE_EFFECTS
      };
    }

    const users = game.users.filter(u => u.id !== game.user.id).map(user => {
      const settings = user.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
      // Use Foundry's safe avatar method or default if avatar is a local file
      let avatar = user.avatar;
      if (avatar && avatar.startsWith('file://')) {
        avatar = 'icons/svg/mystery-man.svg'; // Foundry's default avatar
      }
      return {
        id: user.id,
        name: user.name,
        avatar: avatar,
        color: sanitizeColor(user.color),
        isGM: user.isGM,
        settings: {
          color: sanitizeColor(settings.color),
          effect: settings.effect || DEFAULT_SETTINGS.effect,
          symbol: sanitizeSymbol(settings.symbol),
          customSymbol: settings.customSymbol || ''
        }
      };
    });
    const gmUser = game.user;
    const gmSettings = gmUser.getFlag(MODULE_ID, 'settings') || { ...DEFAULT_SETTINGS };
    // Use Foundry's safe avatar method or default if avatar is a local file
    let gmAvatar = gmUser.avatar;
    if (gmAvatar && gmAvatar.startsWith('file://')) {
      gmAvatar = 'icons/svg/mystery-man.svg'; // Foundry's default avatar
    }
    return {
      gm: {
        id: gmUser.id,
        name: gmUser.name,
        avatar: gmAvatar,
        color: sanitizeColor(gmUser.color)
      },
      users: users,
      gmSettings: {
        color: sanitizeColor(gmSettings.color),
        effect: gmSettings.effect || DEFAULT_SETTINGS.effect,
        symbol: sanitizeSymbol(gmSettings.symbol),
        customSymbol: gmSettings.customSymbol || ''
      },
      effects: AVAILABLE_EFFECTS,
      symbols: AVAILABLE_SYMBOLS
    };
  }

  activateListeners(html) {
    super.activateListeners?.(html);
    const $btns = html.find('.rnk-upload-btn');
    $btns.on('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const btn = ev.currentTarget;
      const target = btn.dataset.target;

      if (typeof FilePicker !== 'function') {
        ui.notifications.error('FilePicker is not available in this environment.');
        html.find(`[name="${target}"]`).focus();
        return;
      }

      try {
        const value = await new Promise(resolve => {
          const fp = new FilePicker({ type: "image", callback: (path) => resolve(path) });
          fp.browse();
        });
        if (value) {
          const $input = html.find(`[name="${target}"]`);
          $input.val(value).trigger('change');
        }
      } catch (err) {
        console.error('RNK™ Illumination | Upload handler error', err);
      }
    });
  }

  static async #onSubmit(_event, _form, formData) {
    if (!game.user?.isGM) {
      ui.notifications.error("Only GMs can modify player settings");
      return;
    }

    const data = formData.object;
    const gmColor = data.gmColor;
    const gmEffect = data.gmEffect;
    const gmCustomSymbol = (data.gmCustomSymbol || '').trim();
    let gmSymbol = gmCustomSymbol || data.gmSymbol || DEFAULT_SETTINGS.symbol;

    if (!/^#[0-9A-F]{6}$/i.test(gmColor)) return;
    if (!AVAILABLE_EFFECTS.includes(gmEffect)) return;
    if (!isValidSymbol(gmSymbol)) return;

    try {
      const gmSettings = { color: gmColor, effect: gmEffect, symbol: gmSymbol };
      await game.user.setFlag(MODULE_ID, 'settings', gmSettings);

      for (const user of game.users.filter(u => u.id !== game.user.id)) {
        const color = data[`${user.id}_color`];
        const effect = data[`${user.id}_effect`];
        const customSymbol = (data[`${user.id}_customSymbol`] || '').trim();
        const symbol = customSymbol || data[`${user.id}_symbol`];
        
        if (!/^#[0-9A-F]{6}$/i.test(color)) continue;
        if (!AVAILABLE_EFFECTS.includes(effect)) continue;
        if (!isValidSymbol(symbol)) continue;

        const settings = {
          color: color,
          effect: effect,
          symbol: symbol,
          customSymbol: customSymbol || ''
        };
        await user.setFlag(MODULE_ID, 'settings', settings);
      }
      ui.notifications.info("GM and player settings updated");
      setTimeout(() => {
        try {
          if (globalThis.refreshAllTokenIllumination) globalThis.refreshAllTokenIllumination();
        } catch (e) {}
      }, 100);
    } catch (err) {
      console.error("RNK™ Illumination | Failed to save settings", err);
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
  new RNKGMHub().render(true);
}
