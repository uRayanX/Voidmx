# Void Music Player (Spoti)

A sleek, aesthetic, and highly intelligent web-based music player and discovery platform. Void combines a minimalist, monochrome design language with advanced audio streaming capabilities and intelligent queueing to provide an immersive listening experience.

## Features

- **High-Fidelity Lossless Audio**: Delivers an unparalleled listening experience with native support for pristine, uncompressed lossless audio streaming.
- **Minimalist Interface**: A completely custom, dark-mode first UI heavily inspired by monochrome styling. Features seamless screen transitions, responsive dynamic grids, custom modal dialogs for playlist creation, and unobtrusive controls.
- **Intelligent Infinite Radio & Recommendations**: An advanced recommendation algorithm that intelligently analyzes your active seed tracks.
  - **ISRC & Language Prioritization**: Accurately selects recommendations based on regional ISRC codes and languages while filtering out generic global distributors.
  - **Dynamic Play History Inferences**: Automatically surfaces the most popular genres matching your play history on the home screen.
  - **Artist Spacing**: Enforces rules to strictly prevent artist fatigue in the radio queue.
- **Complete Queue Management**: "Up Next" tracker with custom reordering, hover-to-remove states, intelligent clear mechanics, and persistent local storage queue retention.
- **Synced Lyrics Display**: Deep integration with lyrics providers for synchronized, auto-scrolling lyrics mapping line-by-line to the active track.
- **Custom Playback Engine & Mini Player**: Complete mastery over audio playback (play/pause/skip/seek/volume) with a sleek floating mini-player, supporting native audio layers with quality fallbacks.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **State Management**: Zustand v5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite 5
- **Network**: Axios 1.13.6
- **APIs**: Leverages robust music/audio infrastructure including Tidal metadata, Monochrome.tf instances, and Web Playback layers.

**RED ALERT / CRITICAL WARNING**: NEVER update Axios beyond version 1.13.x. Specially, NEVER update to version 1.14.1 at any cost. Doing so will comprromise the entire project and system.

## Setup and Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` over to `.env` to supply the necessary Client IDs and configuration tokens if applicable.
   ```bash
   cp .env.example .env
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Available locally at `http://localhost:5173/`

## Changelog

All notable changes are tracked in the CHANGELOG.md file.
