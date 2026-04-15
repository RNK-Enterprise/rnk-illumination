RNK™ ILLUMINATION

An advanced Foundry VTT module providing custom underglow illumination effects for
owned, assigned, and targeted tokens with a GM and Co-GM hub for configuration.

Compatible with Foundry VTT v13-14 (minimum: 13, verified: 14)


FEATURES

- GM and Co-GM Hub: GM can configure all users, while Co-GMs can manage their own settings
- Heavy Underglow Effects: Custom PIXI filters for stunning visual effects (glow, outline, shadow, neon)
- Automatic Application: Illuminates owned or assigned tokens and targets with radiating underglow
- Standard Targeting: Right-click to target tokens with optional hovered-token hotkey support
- Universal Visibility: Effects are visible to all players for clear targeting indication
- Symbol Marker Lines: Distance markers use the selected symbol or uploaded image marker
- System Agnostic: Works with any game system
- Language Support: English (additional languages upon request)


EFFECTS AVAILABLE

- Glow: Radiating colored glow around tokens
- Outline: Colored outline effect
- Shadow: Drop shadow with color tint
- Neon: Intense glowing effect


INSTALLATION

1. Download the latest release from GitHub Releases.
2. Copy the rnk-illumination folder into your Foundry VTT Data/modules directory.
3. Restart Foundry VTT or refresh your browser.
4. Enable the module in the Module Management menu.

Manifest URL
https://github.com/RNK-Enterprise/rnk-illumination/releases/latest/download/module.json


USAGE

Scene Control Button
- Look for the lightbulb icon in the scene controls toolbar
- Click it to open the illumination hub

Macro for Hotkey
Note: The GM or a designated Co-GM can open the Illumination Hub.

For GM or Co-GM:
  openIlluminationHub();

Assign a hotkey to the macro for quick access.

For Administrators
1. Open GM hub via scene control button or macro
2. Configure your own settings and token assignment
3. If you are the GM, view and modify settings for all players and Co-GMs
4. If you are a Co-GM, manage your own settings from the same hub
5. Control your assigned token or target to apply effects


TARGETING

- Left-Click: Control tokens
- Right-Click: Target/untarget tokens (default Foundry behavior)
- Shift+T: Toggle targeting on the currently hovered token
- Effects automatically apply to owned or assigned tokens and active targets


LICENSE

RNK Proprietary License - See LICENSE file for details

MY STORY

RNK™ Enterprises is built by The Curator, a retired truck driver, self-taught coder, and stroke survivor who builds Foundry VTT modules with a relentless focus on reliability, performance, and originality.

SUPPORT

https://patreon.com/RagNaroks