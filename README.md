# RNK™ Illumination

An advanced Foundry VTT module providing custom underglow illumination effects for owned, assigned, and targeted tokens with a GM and Co-GM hub for configuration.

**Compatible with Foundry VTT v13-14 (minimum: 13, verified: 14)**

## Features

- **GM and Co-GM Hub:** GM can configure all users; Co-GMs can open the hub and manage their own settings
- **Heavy Underglow Effects:** Custom PIXI filters for stunning visual effects (glow, outline, shadow, neon)
- **Automatic Application:** Illuminates owned or assigned tokens and targeted tokens with radiating underglow
- **Standard Targeting:** Right-click to target tokens with optional hovered-token hotkey support
- **Universal Visibility:** Effects are visible to all players for clear targeting indication
- **Symbol Marker Lines:** Targeting distance markers use the selected symbol or uploaded image marker
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
3. Search for **RNK™ Illumination**
4. Click **Install**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/RNK-Enterprise/rnk-illumination/releases)
2. Extract to your `Data/modules/` directory
3. Restart Foundry VTT
4. Enable the module in your world

### Manifest Installation

Use this manifest URL in Foundry if you are installing directly:

`https://github.com/RNK-Enterprise/rnk-illumination/releases/latest/download/module.json`

## Usage

### Scene Control Button

Look for the lightbulb icon in the scene controls toolbar and click it to open the illumination hub.

### Macro for Hotkey

Create a new macro in Foundry and paste this script:

**Note:** The GM or a designated Co-GM can open the Illumination Hub.

**For GM or Co-GM:**
```javascript
openIlluminationHub();
```

Assign a hotkey to the macro for quick access.

### Player Settings

Players do not have a hub; illumination settings are controlled through the administrator hub.

### For Administrators

1. Open GM hub via scene control button or macro
2. Configure your own settings and token assignment
3. If you are the GM, view and modify settings for all players and Co-GMs
4. If you are a Co-GM, manage your own settings from the same hub
5. Control your assigned token or target tokens to apply effects

## Targeting

- **Left-Click:** Control tokens
- **Right-Click:** Target/untarget tokens (default Foundry behavior)
- **Shift+T:** Toggle targeting on the currently hovered token
- Effects automatically apply to owned or assigned tokens and to active targets

## Notes

- Effects use PIXI filters for custom underglow rendering
- Settings are stored per user and persist across sessions
- GM can override any player's settings and manage Co-GM access
- Effects are applied client-side but visible to all players
- Targeting lines use the active symbol selection for distance markers

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## My Story

RNK™ Enterprises is built by The Curator, a retired truck driver, self-taught coder, and stroke survivor who builds Foundry VTT modules with a relentless focus on reliability, performance, and originality.

---

## License

RNK Proprietary License - See [LICENSE](LICENSE) for details

## Credits

**Developed by:** RNK™ Enterprises  
**Website:** [https://github.com/RNK-Enterprise](https://github.com/RNK-Enterprise)  
**Support:** [https://patreon.com/RagNaroks](https://patreon.com/RagNaroks)