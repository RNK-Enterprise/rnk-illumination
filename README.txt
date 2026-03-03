RNK ILLUMINATION

An advanced Foundry VTT module providing custom underglow illumination effects for
tokens with a GM hub for configuration.

Compatible with Foundry VTT v11, v12, and v13


FEATURES

- GM Hub: GM can configure settings and view/override all player settings
- Heavy Underglow Effects: Custom PIXI filters for stunning visual effects (glow, outline, shadow, neon)
- Automatic Application: Illuminates controlled tokens and targets with radiating underglow
- Standard Targeting: Right-click to target tokens (compatible across all Foundry versions)
- Universal Visibility: Effects are visible to all players for clear targeting indication
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


USAGE

Scene Control Button
- Look for the lightbulb icon in the scene controls toolbar
- Click it to open the illumination hub

Macro for Hotkey
Note: Only the GM can open the Illumination Hub.

For GM:
  new RNKGMHub().render(true);

Assign a hotkey to the macro for quick access.

For GM
1. Open GM hub via scene control button or macro
2. Configure your own settings
3. View and modify settings for all players
4. Control tokens or target to apply effects


TARGETING

- Left-Click: Control tokens
- Right-Click: Target/untarget tokens (default Foundry behavior)
- Effects automatically apply to controlled tokens and targets


LICENSE

RNK Proprietary License - See LICENSE file for details