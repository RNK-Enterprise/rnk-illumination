/**
 * RNK Illumination Module - Minimal Test Version
 * Testing targeting line rendering
 */

console.log('RNK™ Illumination | Minimal version - Script loaded!');

const MODULE_ID = 'rnk-illumination';
let _targetingLineContainer = null;

// Simple Hub Form Application
class RNKGMHubForm extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'rnk-gm-hub',
      title: 'RNK™ GM Illumination Hub',
      template: 'modules/rnk-illumination/templates/gm-hub.html',
      width: 600,
      height: 500,
      resizable: true,
      closeOnSubmit: true
    });
  }

  getData(options) {
    return {
      isGM: game.user?.isGM
    };
  }

  async _updateObject(event, formData) {
    console.log('RNK™ Illumination | Hub settings updated:', formData);
  }
}

Hooks.on('init', () => {
  console.log('RNK™ Illumination | init hook fired');
});

Hooks.on('ready', () => {
  console.log('RNK™ Illumination | ready hook fired - Minimal Edition');
  
  // Register GM Hub menu
  if (game.user?.isGM) {
    console.log('RNK™ Illumination | GM detected, registering hub menu');
    
    game.settings.registerMenu(MODULE_ID, 'gmHub', {
      name: 'RNK Illumination Hub',
      label: 'Open Hub',
      hint: 'Configure player illumination colors and effects',
      icon: 'fas fa-palette',
      type: RNKGMHubForm,
      restricted: true
    });
    console.log('RNK™ Illumination | Hub menu registered successfully');
  }
});

Hooks.on('canvasReady', () => {
  console.log('RNK™ Illumination | canvasReady hook fired');
  initTargetingLines();
});

Hooks.on('targetToken', (user, token, isTargeted) => {
  console.log(`RNK™ Illumination | targetToken hook fired! User: ${user?.name}, Token: ${token?.name}, isTargeted: ${isTargeted}`);
  if (token && isTargeted) {
    drawTestLine(token);
  }
});

function initTargetingLines() {
  console.log('RNK™ Illumination | initTargetingLines called');
  
  if (!canvas?.tokens) {
    console.log('RNK™ Illumination | Canvas tokens layer not ready');
    return;
  }
  
  if (!_targetingLineContainer || _targetingLineContainer.destroyed) {
    _targetingLineContainer = new PIXI.Container();
    _targetingLineContainer.zIndex = 999;
    canvas.tokens.addChild(_targetingLineContainer);
    console.log('RNK™ Illumination | Created new targeting line container');
  }
}

function drawTestLine(targetToken) {
  console.log(`RNK™ Illumination | Drawing test line to ${targetToken.name}`);
  
  if (!canvas?.tokens?.controlled?.[0]) {
    console.log('RNK™ Illumination | No controlled token found');
    return;
  }
  
  initTargetingLines();
  
  const userToken = canvas.tokens.controlled[0];
  console.log(`RNK™ Illumination | User token: ${userToken.name}`);
  
  // Clear previous graphics
  _targetingLineContainer.removeChildren();
  
  // Create graphics for the line
  const graphics = new PIXI.Graphics();
  
  // Draw a simple red line from user to target
  graphics.lineStyle(4, 0xff0000, 1);
  graphics.moveTo(userToken.x + userToken.width / 2, userToken.y + userToken.height / 2);
  graphics.lineTo(targetToken.x + targetToken.width / 2, targetToken.y + targetToken.height / 2);
  
  // Add to container
  _targetingLineContainer.addChild(graphics);
  
  console.log(`RNK™ Illumination | Test line drawn from ${userToken.name} to ${targetToken.name}`);
}

console.log('RNK™ Illumination | Minimal module initialization complete');
