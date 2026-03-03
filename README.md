# RNK Illumination

An advanced Foundry VTT module providing custom underglow illumination effects for tokens with a GM hub for configuration.

**Compatible with Foundry VTT v11, v12, and v13**

## Features

- **GM Hub:** GM can configure settings and view/override all player settings
- **Heavy Underglow Effects:** Custom PIXI filters for stunning visual effects (glow, outline, shadow, neon)
- **Automatic Application:** Illuminates controlled tokens and targets with radiating underglow
- **Standard Targeting:** Right-click to target tokens (compatible across all Foundry versions)
- **Universal Visibility:** Effects are visible to all players for clear targeting indication
- **System Agnostic:** Works with any game system
- **Language Support:** English (additional languages available upon request)

## Effects Available

- **Glow:** Radiating colored glow around tokens
- **Outline:** Colored outline effect
- **Shadow:** Drop shadow with color tint
- **Neon:** Intense glowing effect

## Installation

### Via Foundry VTT Module Browser

1. Open Foundry VTT
2. Navigate to **Add-on Modules**
3. Search for **RNK Illumination**
4. Click **Install**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/RNK-Enterprise/rnk-illumination/releases)
2. Extract to your `Data/modules/` directory
3. Restart Foundry VTT
4. Enable the module in your world

## Usage

### Scene Control Button

Look for the lightbulb icon in the scene controls toolbar and click it to open the illumination hub.

### Macro for Hotkey

Create a new macro in Foundry and paste this script:

**Note:** Only the GM can open the Illumination Hub.

**For GM:**
```javascript
new RNKGMHub().render(true);
```

Assign a hotkey to the macro for quick access.

### Player Settings

Players do not have a hub; illumination settings are controlled by the GM via the GM Hub.

### For GM

1. Open GM hub via scene control button or macro
2. Configure your own settings
3. View and modify settings for all players
4. Control tokens or target to apply effects

## Targeting

- **Left-Click:** Control tokens
- **Right-Click:** Target/untarget tokens (default Foundry behavior)
- Effects automatically apply to controlled tokens and targets

## Notes

- Effects use PIXI filters for custom underglow rendering
- Settings are stored per user and persist across sessions
- GM can override any player's settings
- Effects are applied client-side but visible to all players

---

## Release Notes

### v2.3.0

- Multiple Targeting Lines: Support for simultaneous targeting of multiple tokens
- User Color Lines: Targeting lines now match each user's configured hub color
- Symbol Markers: Distance markers display user's configured symbol/icon
- Pulsating Targets: Targeted tokens now pulsate with their illumination effect
- Enhanced Targeting: Improved targeting system with visual feedback

### v2.2.0

- Targeting Lines: Visual measurement lines between user tokens and targets
- Selectable Origin for GMs: Crosshair button on NPC tokens to mark targeting source
- Distance Markers: Automatic distance markers every 5 feet along targeting lines
- Arrow Indicators: Directional arrows showing targeting direction
- Canvas Integration: Lines render on canvas controls layer for proper visibility

### v1.0.0

- Initial release of RNK Illumination
- Advanced token illumination with custom underglow effects
- GM configuration hub with player management
- 12 targeting symbols and 4 effect types
- Full compatibility with Foundry VTT v11-13
- System-agnostic design

---

## License

RNK Proprietary License - See [LICENSE](LICENSE) file for details

## Credits

**Developed by:** Asgard Innovations  
**Website:** [https://github.com/RNK-Enterprise](https://github.com/RNK-Enterprise)  
**Support:** [https://patreon.com/RagNaroks](https://patreon.com/RagNaroks)