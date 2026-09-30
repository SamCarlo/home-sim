# 07 — Phase 3: Design

The teacher: "If they chose to build their own house, the player will be given a lot of design tools to create a
blueprint on a UI that previews the results of their choices. If the student chose to move into an apartment, they
basically just get to choose which building and floor they live in from a set of procedurally created 3d models that
match the styles of the town/city they chose."

## 1. Modes by home type (`phases/design/designScreen.js`)

| Home type | Design mode | Module |
|---|---|---|
| apartment | pick building → floor → unit | `apartmentPicker.js` |
| condo | same picker (condo buildings) | `apartmentPicker.js` |
| shared | pick house → room → meet roommates | `sharedPicker.js` |
| house | pick one of 3 listings → light customizing | `housePicker.js` |
| build | full blueprint editor with live 3D preview | `blueprint/editor.js` + `blueprint/view3d.js` |

Every mode has:
- a 3D view (orbit to rotate, wheel to zoom);
- a side panel;
- a "Your home" summary card with a fictional address label such as "Unit 4B · Kaiko Terrace · Hilo";
- a **Move in** button.

**Move in** does the following:
- writes the complete `home` (see `02` §2);
- creates the starting `plants` and `animals` from the design choices;
- sets `phase = 'life'`, `life.monthIndex = 0` and `life.current = {stage: 'welcome'}`;
- saves a checkpoint (`design-finalized`).

Rent, loan and price were settled in Phase 2. Design choices are **cosmetic plus small lifestyle modifiers**:
noise, view/nature, social, and garden potential. The only exceptions are a few optional purchases (plants, a coop, a pet)
paid from savings, and the build budget.

## 2. Apartment & condo picker

- **Three buildings**, each `buildingGen.generate({style, seed: seedFor(meta.seed,'building',i), kind})`:
  - a fictional name (e.g. "Kaiko Terrace", "The Alder");
  - floors: from the style family's range for the settlement (Pāhoa/Hilo 2–4, Honolulu 12–30, Brooklyn walk-up 4–6 or
    tower 12–20, Miami 8–25, Seattle 5–7, small towns 2–3);
  - amenities tags: laundry, parking, elevator, pool, gym, rooftop. These nudge metrics: a pool or gym gives +1 gym
    access, and no elevator above the 3rd floor adds "lots of stairs".
- **Floors → units**: 4–8 units per floor, each with seeded traits:
  - view: ocean / mountain / city / courtyard / street, depending on the location;
  - noise: street-facing and low floors are louder, high floors quieter;
  - sun: morning or afternoon;
  - stairs, for walk-ups.
- **UI**:
  - all three buildings side by side in the 3D view (or one at a time with arrows on small screens);
  - building cards → floor selector: a list, or clicking a floor band in 3D, which highlights it;
  - unit cards → confirm;
  - the chosen unit glows, and later it is where the balcony plants go.
- **Lifestyle modifiers** stored in `home.lifestyle`: `noise` (±1), `view` (0–2: nature view counts toward nature access),
  `stairs` (+physical, and chores +0.5 h/week).

## 3. House picker (house purchase)

- Three **listings** from `houseGen.generate({style, seed, variant})`:
  - fictional address; sq ft and beds/baths near the location's median; lot size; year built;
  - one seeded quirk: "old roof", "big yard", "solar panels", "fixer-upper kitchen", "mountain view", "on a busy street";
  - all at the approved price (`choice.snapshot`).
  - The quirks matter: an old roof raises the roof-repair event chance, solar cuts electricity 50%, a busy street means noise +1.
- **Light customization**, charged from savings (keep at least $0; warn below $1,000):
  - exterior palette (3–4 options from the style family);
  - garden beds 0–3 ($120 each);
  - fruit trees 0–2 ($60 each; the kind depends on the biome: mango/citrus in Hawaiʻi, apple up north, fig in the desert…);
  - chicken coop plus 3 hens ($400);
  - pet: none / cat ($150) / dog ($250). Pets add monthly food and vet costs later.

## 4. Shared-living picker

- Three shared houses or apartments, each generated with `houseGen` (`variant: 'shared'`) or `buildingGen`, depending on the style.
- **Rooms**: 2–3 options per house (size, window view, closet, shared or private bathroom). The rent is the same;
  the differences are comfort and noise.
- **Roommates**: two fictional roommates per house, each with a first name, age (19–35), and traits from these pairs:
  tidy/messy, early bird/night owl, social/quiet, hobbies. The traits set modifiers:
  - social +0–2;
  - noise +0–1;
  - chores −1 to +1 h/week.
  - The Phase 2 roommate agreement's quiet hours and chores system soften the negative traits.
- Optional potted plants ($20 each, up to 3) on a windowsill or lānai.

## 5. Blueprint editor (build)

**Budget**: the design budget from Phase 2 (`05` §4). The blueprint's cost must be ≤ the budget to move in.

**Coordinates**: feet, with the origin at the lot's front-left corner, x to the right and y toward the back. The lot
comes from the location's build record (`lotWidthFt × lotDepthFt`). For lots larger than ~120 × 120 ft, the editor
shows a 120 × 120 ft buildable window. Setbacks come from config: front 15 ft, sides 5 ft, rear 10 ft. The grid is
2 ft with snapping.

**Blueprint model** (`blueprint/model.js`, pure):

```js
{ version: 1,
  lot: { widthFt, depthFt, setbacks: { front, side, rear } },
  rooms: [ { id, type, x, y, w, h } ],                       // axis-aligned rectangles, feet
  openings: [ { id, kind: 'door'|'window', roomA, roomB|null, x1, y1, x2, y2, widthFt } ],   // on a shared or exterior wall segment
  roof: { style: 'gable'|'hip'|'shed'|'flat', material: 'metal'|'shingle'|'tile', color },
  exterior: { siding: 'board'|'board-and-batten'|'stucco'|'brick'|'log'|'vinyl', color, trim },
  yard: [ { id, kind, x, y, w, h, rotation } ],              // garden-bed, fruit-tree, coop, fence, driveway, patio, rain-garden
  solarKw: 0, catchmentGallons: 0, solarWaterHeater: true }
```

Pure helpers: `addRoom`, `moveRoom`, `resizeRoom`, `removeRoom`, `toggleOpening`, `wallsOf(room)`,
`sharedWalls(a, b)`, `exteriorWalls(blueprint)`, `footprintArea`, `adjacency`.

**Room types** (cost multiplier × the local cost per sq ft · minimum size):

| Type | Multiplier | Minimum |
|---|---|---|
| bedroom | 1.0 | 70 sq ft and ≥ 7 ft wide |
| living | 1.0 | 120 |
| dining | 1.0 | 70 |
| office | 1.0 | 50 |
| hallway | 0.9 | 3 ft wide |
| closet | 0.8 | 6 |
| laundry | 1.2 | 25 |
| kitchen | 1.6 | 50 |
| bathroom | 1.8 | 35 |
| garage/workshop | 0.6 | 200 (12 × 20) |
| lānai/porch/deck (covered, outdoor) | 0.45 | 40 |

**Tools** (`blueprint/tools.js`, `editor.js`: an SVG canvas plus a tool palette):
- **Select**: click a room; drag to move; corner/edge handles to resize. With the keyboard, arrows move by 2 ft,
  Shift+arrows resize, and Delete removes.
- **Draw room**: drag a rectangle, then pick its type from a popover (the type can be changed later).
- **Door**: click a wall segment shared by two rooms, or an exterior wall. Toggles a 3 ft door (exterior doors are marked).
- **Window**: click an exterior wall segment. Toggles a 3–4 ft window.
- **Roof** panel: style, material, color. **Exterior** panel: siding, color, trim (palettes from the style family plus a
  small custom set).
- **Yard** panel: place garden beds (4×8), fruit trees, a chicken coop (6×8), a driveway, a patio, a rain garden;
  toggle a perimeter fence; set solar kW (0–8); set catchment size (required where `water === 'catchment'`).
  Site-utilities choices from Phase 2 are pre-filled.
- **Templates**: Tiny (~500 sq ft, 1 bedroom), Cozy (~950, 2 bedrooms), Family (~1,450, 3 bedrooms). Each is a valid
  starting plan that fits its tier's budget in every location where building is available, so a stuck student always
  has a way forward.
- **Undo/Redo**: Ctrl+Z and Ctrl+Shift+Z, 50 steps. **Zoom/pan**: wheel, and drag with Space held. **Clear**, with confirm.
- Status bar: the total area, room count, and cost vs budget.

**Validation** (`blueprint/validate.js`, pure). These **block** Move in:
- at least 1 bedroom, 1 bathroom, 1 kitchen and 1 living room;
- no overlapping rooms;
- every room inside the setbacks;
- every room reachable from outside, meaning a BFS over rooms joined by doors reaches all of them from at least one exterior door;
- every bedroom has a window (fire escape rule);
- catchment present where required;
- cost ≤ budget.

These are **warnings** only: a room under its minimum size, a living room with no windows, a bathroom opening straight
into the kitchen, a house with only one exterior door.

**Cost** (`blueprint/cost.js`, pure). All of the following:
- Σ(room area × multiplier) × `location.housing.build.buildCostPerSqftCents`;
- roof area (footprint × 1.15) × material factor (metal 1.0, shingle 0.9, tile 1.3) × $12/sq ft baseline × the local
  cost index (the location's cost per sq ft ÷ $300);
- exterior wall area (perimeter × 9 ft) × siding factor (board 1.0, board-and-batten 1.05, stucco 1.1, brick 1.4,
  log 1.3, vinyl 0.8) × $8/sq ft × the cost index;
- doors: $900 exterior, $350 interior; windows $600 each;
- yard: garden bed $150, fruit tree $80, coop $600, fence $25/ft, driveway $8/sq ft, patio $12/sq ft,
  rain garden $400, solar $3,000/kW, catchment 10,000 gal $8,000 (scaled by size), solar water heater $4,500 (required
  in Hawaiʻi).

It returns an itemized breakdown for the budget panel: a bar showing spent vs budget, which turns red when over.

**Live 3D** (`blueprint/view3d.js` + `three/blueprintTo3d.js`, task 41):
- A split view: the editor on the left (~55%) and 3D on the right (~45%).
- The 3D rebuilds 250 ms after the last change (debounced).
- Move in stores `home.blueprint`, creates plants from garden beds and fruit trees and animals from the coop (3 hens),
  and adds an optional pet.

## 6. Seeds

- `design-apartment-hilo`
- `design-condo-miami`
- `design-shared-honolulu`
- `design-house-katy`
- `design-build-pahoa` (a Cozy budget, with the empty-lot editor)
- `design-build-template` (a Cozy template already placed)
