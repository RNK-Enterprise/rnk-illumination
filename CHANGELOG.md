# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.5.15] - 2026-05-02

### Fixed
- Prevented a canvas initialization crash when the targeting toggle setting has not been registered yet.

## [2.5.14] - 2026-04-22

### Fixed
- Restored standard Shift multi-target selection by making RNK™ Illumination targeting overlays and distance markers click-through.

## [2.5.13] - 2026-04-22

### Added
- GM hub object browser with search and layer filtering for custom-illuminated tiles, drawings, walls, and ambient lights.
- Per-object illumination dialogs and hub actions for editing or clearing scene object settings.

### Changed
- Added a GM hub toggle to disable targeting visuals while preserving token glow.
- Expanded the shared illumination effect pipeline to support non-token placeables.
- Updated the release notes and documentation for the new illumination workflow.

## [2.5.12] - 2026-04-15

### Release Alignment
- Updated compatibility to Foundry VTT v13-14.
- Switched manifest URL to the GitHub release latest download endpoint.
- Removed stale packaged zips and prepared for version bump.

## [2.5.10] - 2026-03-31
### Changed
- Bumped the release metadata for the free-module publish.
- Marked the Foundry manifest as unprotected for public distribution.

### Release
- Prepared the repository for zip packaging, tagging, and GitHub release publication.

## [2.5.9] - 2026-03-31
### Changed
- Split targeting line logic into its own module to keep the runtime under the 500 LOC limit.
- Updated manifest and package metadata for RNK™ branding, proprietary licensing, and Foundry V13 compatibility.
- Switched release download metadata to the latest GitHub release asset path to avoid stale version links.
- Localized hub, control, keybinding, and notification strings.

### Fixed
- Co-GM users can now open the hub from the standard scene control flow.
- Token assignment saves now correctly clear previous token bindings before writing the new assignment.
- Assigned GM tokens now synchronize their token flags so illumination ownership stays consistent.
- Targeting distance markers now use the selected symbol instead of hardcoded arrows.
- Hover targeting no longer depends on a private canvas token layer property.
- Removed dead avatar upload controls and corrected the broken avatar CSS block.

## [2.5.8] - 2026-03-13
### Fixed
- Co-GM controls now correctly apply to the current user; each Co-GM’s color and settings are now independent.
- Token assignment integrity fixed so assigned tokens properly use the owning user’s illumination settings.
- Prevented illumination from breaking when accessing token flags on non-document objects.

## [2.5.7] - 2026-03-13
### Added
- Token assignment feature (allow tokens to be assigned to players and Co-GMs).
- Co-GM support in Illumination Hub (Co-GMs can open the hub and manage their own settings).

### Changed
- Bumped version for token assignment feature.

## [2.5.6] - 2026-03-13
### Fixed
- Targeting line now updates correctly when tokens move (no stale lines remaining).

## [2.5.5] - 2026-03-13
### Changed
- Cleanup: fixed module metadata, removed development artifacts, and updated README.
