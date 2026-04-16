# Executive Hangar Status

Executive Hangar Status is a lightweight, front‑end tracker for the PYAM Executive Hangar rotation in *Star Citizen*. It keeps the 185m 699ms cadence accurate, shows the live ONLINE/OFFLINE state, and bundles useful tools for self-service card runs and hangar planning.

## Highlights

- **Live state & forecast** – Real-time countdown, five-light phase indicator, and a three-day scroll-locked forecast so the core layout never shifts.
- **Self timers** – Dedicated timers for Checkmate, Orbituary, Ruin Station, and supervisor routes. Start/pause, ±1m nudges, instant chime, and optional desktop notifications the moment a timer ends.
- **Map selector + overlay** – Choose a location from the list, preview it inside a fixed 16:9 frame, and open a full-resolution overlay without spawning a new tab.
- **Inline reminder** – A small callout above the timer grid reiterates that everything runs locally and that desktop notifications are optional.
- **Single source of truth** – `config.json` controls server epoch, durations, and the visible version banner so patch updates are one edit away.

## Customize / extend

- **Timing updates** – Edit `config.json` (start epoch, open/close duration, cycle offset).  
- **Forecast horizon** – Tweak `eventWindow` in `app.js`.  
- **Theme tweaks** – Adjust background or surface rgba values in `style.css`.  
- **Map assets** – Drop new `.webp` files into `assets/` and update the data attributes in `index.html`.

## Project layout

```
.
├─ index.html       # Status layout, timers, map selector
├─ app.js           # Cycle math + schedule rendering
├─ timers.js        # Self-timer logic, notifications, map overlay
├─ style.css        # Theme + layout rules
├─ config.json      # Version + timing configuration
├─ assets/          # Background art, map images
└─ license/         # Standalone MIT license view
```

## Contributing

Issues and pull requests are welcome. If you open a PR, please include:

1. A clear description of the change and why it is needed.  
2. Any manual testing steps or screenshots that confirm the behaviour.  
3. Documentation or comment updates when behaviour changes.

## License & notice

Licensed under the [MIT License](LICENSE.md).  
Star Citizen®, Roberts Space Industries®, and Cloud Imperium® are trademarks of Cloud Imperium Rights LLC. This project is fan-made and unaffiliated.

## Credits

- Project maintained by [NBDBatman / MercuryHQ](https://github.com/NBDBatman) / [Arkanis Corporation](https://github.com/arkanisCorporation/).  
- Inspired by the original tracker at [exec.xyxyll.com](https://exec.xyxyll.com/)--huge thanks to Xyxyll for the groundwork.