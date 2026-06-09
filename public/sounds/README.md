# Sound Assets

Production sound effects in this directory use the exact file names below.

Do not commit large raw project files. Prefer short, compressed MP3 files.

Current source: Kenney Interface Sounds 1.0, licensed under Creative Commons Zero (CC0).
Source page: https://kenney.nl/assets/interface-sounds
The copied license text is kept in `KENNEY_LICENSE.txt`.

Current BGM source: OpenGameArt `relax_background1` by joaquinton, licensed under CC0.
Source page: https://opengameart.org/content/relaxbackground1-0

| File | Purpose |
| --- | --- |
| `ui-click.mp3` | General button click and screen transition feedback |
| `tile-buy.mp3` | Buying a tile from the shop |
| `tile-sell.mp3` | Selling or discarding a tile |
| `shop-refresh.mp3` | Refreshing the shop |
| `shop-lock.mp3` | Locking or unlocking the shop |
| `level-up.mp3` | Successful level up |
| `hand-sort.mp3` | Sorting the hand |
| `augment-pick.mp3` | Choosing an augment |
| `turn-end.mp3` | Ending the turn |
| `win-hu.mp3` | Current player wins a hand |
| `ai-hu.mp3` | Another player or AI wins a hand |
| `damage-hit.mp3` | Current player takes settlement damage |
| `game-win.mp3` | Current player wins the game |
| `game-lose.mp3` | Current player loses the game |
| `bgm-loop.mp3` | Low-volume lyric-free background music loop |

Recommended style: short game UI sounds, 200-900ms each, with soft mahjong tile texture, light metallic accents, and no long tails.

Recommended loudness: keep individual effects normalized around -16 LUFS and avoid clipping. `ai-hu.mp3` should be quieter than `win-hu.mp3`.
