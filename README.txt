RNK™ ILLUMINATION

An advanced Foundry VTT module providing custom underglow illumination effects for
tokens with player/GM hubs for configuration.

Compatible with Foundry VTT v11, v12, and v13


FEATURES

- GM Hub: GM can configure their settings and view/override all player settings
  (players do not have a separate hub)
- Heavy Underglow Effects: Custom PIXI filters for stunning visual effects
  (glow, outline, shadow, neon)
- Automatic Application: Illuminates controlled tokens and targets with radiating underglow
- Standard Targeting: Right-click to target tokens (compatible across all Foundry versions)
- Universal Visibility: Effects are visible to all players for clear targeting indication
- System Agnostic: Works with any game system
- Language Support: Upon request per user


EFFECTS AVAILABLE

- Glow: Radiating colored glow around tokens
- Outline: Colored outline effect
- Shadow: Drop shadow with color tint
- Neon: Intense glowing effect


INSTALLATION

1. Download or clone this repository.
2. Copy the rnk-illumination folder into your Foundry VTT Data/modules directory.
3. Restart Foundry VTT or refresh your browser.
4. Enable the module in the Module Management menu.


USAGE

Scene Control Button
- Look for the lightbulb icon in the scene controls toolbar
- Click it to open your illumination hub instantly

Macro for Hotkey
Create a new macro in Foundry and paste this script:

Note: Only the GM can open the Illumination Hub; players cannot open a hub.

For GM:
  new RNKGMHub().render(true);

Assign a hotkey to the macro for quick access!

Players
Players do not have a hub; illumination settings are controlled by the GM via
the GM Hub.

For GM
1. Open GM hub via scene control button or macro
2. Configure your own settings
3. View and modify settings for all players
4. Control tokens or target to apply effects


TARGETING

- Left-Click: Control tokens
- Right-Click: Target/untarget tokens (default Foundry behavior)
- Effects automatically apply to controlled tokens and targets


NOTES

- Effects use PIXI filters for custom underglow rendering
- Settings are stored per user and persist across sessions
- GM can override any player's settings
- Effects are applied client-side but visible to all players
- Access hubs via scene control button or create macros for hotkeys


MY STORY

I am a Game Master (GM) who has always been passionate about tabletop role-playing
games. My journey into development began unexpectedly after a career as a truck driver
came to an end due to health challenges. In 2021, I suffered several strokes that forced
me off the road, leaving me with limited mobility and energy for outings that would
otherwise exhaust me for days.

What started as simple curiosity about what a macro could do in Foundry Virtual Tabletop
quickly evolved into a full-fledged passion for development. My first major creation was
a 3D animated cube with 41 lines of code, which became the foundation of the RNK brand.
As a self-taught developer working from my garage, I approach every project with meticulous
research and innovative thinking. I refuse to settle for anything less than excellence,
pushing myself to create modules that not only function flawlessly but also enhance the
gaming experience for fellow GMs and players.

This work keeps me engaged and my mind active during a time when physical limitations
restrict my activities. I am engaged to the love of my life, Ms. Lisa, and without her
unwavering support, I wouldn't be able to bring anything that I do to the community. It
is with her support and encouragement that I have excelled to become what I am today.

I will continue creating and innovating until boredom sets in or health prevents it—
whatever comes first. Eventually, I will be looking for someone to take over these
modules, someone with the drive and tenacity that I wake up with every day. In the
meantime, I am open to collaborations if the project peaks my interest. My modules are
born from this dedication, crafted with the same care and precision that defined my
driving career, now channeled into the digital realm of virtual tabletop gaming.

Thank you for supporting my creations and sharing in this journey.

For collaborations or inquiries:
  Email: Asgardinnovations@protonmail.com
  Discord: Odinn1982
  Location: Eastern US

As always, love and respect from the RNK Enterprise, Odinn


RELEASE NOTES v2.3.0

- Multiple Targeting Lines: Support for simultaneous targeting of multiple tokens
- User Color Lines: Targeting lines now match each user's configured hub color
- Symbol Markers: Distance markers display user's configured symbol/icon
- Pulsating Targets: Targeted tokens now pulsate with their illumination effect
- Enhanced Targeting: Improved targeting system with visual feedback


RELEASE NOTES v2.2.0

- Targeting Lines: Visual measurement lines between user tokens and targets
- Selectable Origin for GMs: A crosshair button appears on NPC tokens for GMs; click to
  mark a token as the source of targeting lines, and click again to clear it.
- Distance Markers: Automatic distance markers every 5 feet along targeting lines
- Arrow Indicators: Directional arrows showing targeting direction
- Canvas Integration: Lines render on canvas controls layer for proper visibility


RELEASE NOTES v1.0.0

- Initial release of RNK™ Illumination
- Advanced token illumination with custom underglow effects
- GM configuration hub with player management
- 12 targeting symbols and 4 effect types
- Full compatibility with Foundry VTT v11-13
- System-agnostic design
