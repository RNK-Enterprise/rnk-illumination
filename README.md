# RNK™ Illumination

An advanced Foundry VTT module providing custom underglow illumination effects for tokens with player/GM hubs for configuration.

**Compatible with Foundry VTT v11, v12, and v13**

## Features

- **GM Hub**: GM can configure their settings and view/override all player settings (players do not have a separate hub)
- **Heavy Underglow Effects**: Custom PIXI filters for stunning visual effects (glow, outline, shadow, neon)
- **Automatic Application**: Illuminates controlled tokens and targets with radiating underglow
- **Standard Targeting**: Right-click to target tokens (compatible across all Foundry versions)
- **Universal Visibility**: Effects are visible to all players for clear targeting indication
- **System Agnostic**: Works with any game system

## Effects Available

- **Glow**: Radiating colored glow around tokens
- **Outline**: Colored outline effect
- **Shadow**: Drop shadow with color tint
- **Neon**: Intense glowing effect

## Installation

1. Download or clone this repository.
2. Copy the `rnk-illumination` folder into your Foundry VTT `Data/modules` directory.
3. Restart Foundry VTT or refresh your browser.
4. Enable the module in the Module Management menu.

## Usage

### Scene Control Button
- Look for the lightbulb icon in the scene controls toolbar
- Click it to open your illumination hub instantly

### Macro for Hotkey
Create a new macro in Foundry and paste this script:

**Note:** Only the GM can open the Illumination Hub; players cannot open a hub.

**For GM:**
```javascript
new RNKGMHub().render(true);
```

Assign a hotkey to the macro for quick access!

### Players
Players do not have a hub; illumination settings are controlled by the GM via the GM Hub.
### For GM
1. Open GM hub via scene control button or macro
2. Configure your own settings
3. View and modify settings for all players
4. Control tokens or target to apply effects

## Targeting
- **Left-Click**: Control tokens
- **Right-Click**: Target/untarget tokens (default Foundry behavior)
- Effects automatically apply to controlled tokens and targets

## Notes

- Effects use PIXI filters for custom underglow rendering
- Settings are stored per user and persist across sessions
- GM can override any player's settings
- Effects are applied client-side but visible to all players
- Access hubs via scene control button or create macros for hotkeys

## Release Notes v1.0.0

- Initial release of RNK™ Illumination
- Advanced token illumination with custom underglow effects
- GM configuration hub with player management
- 12 targeting symbols and 4 effect types
- Full compatibility with Foundry VTT v11-13
- System-agnostic design