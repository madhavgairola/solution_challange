# Maritime Supply Chain Intelligence System — Full Technical Writeup

**Project:** Deep Spec  
**Stack:** Vite + Vanilla JS, Leaflet.js, searoute-js  
**Dev Server:** `npm run dev -- --port 5173 --host`

---

## 1. What We Are Building

A **real-time, time-aware, agent-based maritime supply chain simulator** that:

1. Models a global port network as a weighted directed graph
2. Dispatches intelligent cargo agents (ships) that navigate it
3. Injects real-world disruptions (storms, blockades, piracy zones)
4. Predicts cascade delays **before** they reach vessels
5. Auto-reroutes agents based on cargo-specific risk tolerances
6. Visualises all of the above on an interactive dark-theme world map

The core claim: the system does not react to disruptions — it **anticipates** them and acts first.

---

## 2. File Architecture

```
solution_challange/
├── index.html                   # App shell + live simulation clock widget
├── src/
│   ├── main.js                  # Bootstrap + 60 FPS game loop
│   ├── style.css                # Full dark-theme design system
│   ├── data/
│   │   └── network.js           # All ports (nodes) + routes (edges)
│   ├── engine/
│   │   ├── Graph.js             # Directed weighted graph data structure
│   │   ├── RoutingEngine.js     # Dijkstra + Yen's K-Shortest Paths
│   │   ├── ScheduleEngine.js    # Vessel departure schedules
│   │   ├── ShipmentEngine.js    # Agent lifecycle, movement, rerouting
│   │   ├── EventEngine.js       # Disruption injection + edge weight mutation
│   │   └── LiveIntelligenceAgent.js  # Auto-disruption triggers
│   └── ui/
│       ├── MapRenderer.js       # Leaflet map, ship markers, route click
│       ├── NavSidebar.js        # 3-tab navigation shell
│       ├── SandboxDashboard.js  # Control panel (spawn, events, route planner)
│       ├── IRLDashboard.js      # Real-world feed (news + IRL modes)
│       ├── PortSidebar.js       # Port detail popups
│       ├── TelemetryPanel.js    # Live agent cards with segment chain
│       └── ScheduleBoard.js     # Flight-board view of all shipments
```

---

## 3. The Graph Model (`Graph.js` + `network.js`)

The entire world network is represented as a **directed weighted graph**.

### Nodes (Ports)
26 major world ports, each with:
```js
{
  id:        "singapore",
  name:      "Singapore",
  lat, lng,                  // true geographic coordinates
  ocean_lat, ocean_lng,      // offshore anchor point for sea routing
  region:    "Asia-Pacific"
}
```

Ports include: **Los Angeles, New York, Rotterdam, Hamburg, Singapore, Shanghai, Tokyo, Mumbai, Dubai, Sydney, Cape Town, Santos, Busan, Colombo, Suez, Piraeus, Lagos, Houston, Vancouver, Karachi, Chittagong, Manila, Osaka, Jeddah, Mombasa, Valparaiso.**

### Edges (Routes)
Every directional sea lane between connected ports, each carrying:
```js
{
  source, destination,
  base_time,    // days at standard speed (static baseline)
  base_cost,    // logistics cost index
  base_risk,    // piracy + weather baseline risk
  dynamic_time, // live value — mutated by EventEngine
  dynamic_cost,
  dynamic_risk,
  geometry      // [lng, lat] coordinate array (set by searoute-js at render time)
}
```

`dynamic_*` values start equal to `base_*` but are increased/decreased by active events. When `dynamic_time >= 900` the edge is considered **impassable** (blockade).

### Graph API
- `addNode(port)` / `addEdge(route)`
- `getEdges(nodeId)` — directed adjacency list
- `getNode(id)`, `getAllNodes()`, `getAllEdges()`

---

## 4. Routing Engine (`RoutingEngine.js`)

### 4.1 Multi-Objective Cost Function
Every edge gets a composite score:
```
score(edge) = (dynamic_time × w_time) + (dynamic_cost × w_cost) + (dynamic_risk × w_risk)
```
Weights (`w_time`, `w_cost`, `w_risk`) are configurable per cargo type and priority level. This means:
- A **high-priority perishable** cargo gets `w_time = 3.0, w_cost = 0.5, w_risk = 1.5` → always picks fastest path
- An **oil tanker** gets `w_time = 0.5, w_cost = 1.0, w_risk = 3.0` → avoids risky zones even if slower

### 4.2 Dijkstra (`_dijkstra`)
Standard implementation with a fast-path override: if the destination is a direct neighbour and the edge is not impassable, it returns immediately without running the full algorithm.

Supports:
- `excludedNodes: Set` — for Yen's algorithm
- `excludedEdges: Set` — for Yen's algorithm
- Impassable edge filtering (`dynamic_time >= 900`)

Returns: `{ path[], totalTime, totalCost, totalRisk, score, edges[] }`

### 4.3 Yen's K-Shortest Paths (`getKShortestPaths`)
Finds the top `K` loopless alternative paths between any two ports.

**Algorithm:**
1. Find the shortest path (Dijkstra) → add to `A`
2. For each subsequent path k:
   - For each spur node in the previous path:
     - Exclude root-path nodes to prevent loops
     - Exclude edges shared with already-found paths at that root
     - Run Dijkstra from spur node to destination
     - Merge root + spur = candidate path
     - Add to candidate heap `B`
   - Sort `B` by score, move best to `A`

Each alternative path gets a full `edges[]` array reconstructed via `_edgesForPath(path)`.

**Used by:** Route Planner to present 3 options (Optimal, Alternative, Alternate 2) with different tradeoffs.

---

## 5. Schedule Engine (`ScheduleEngine.js`)

Models the **real-world reality** that cargo ships don't depart on-demand — they sail on fixed schedules.

### Schedule Generation
For every edge A→B:
```
frequency = max(0.5, edge.base_time × 0.35) days
offset    = random(0, frequency)   // phase randomisation
```
A 6-day voyage gets a vessel every ~2.1 days. Offsets stagger departures organically.

### `getNextDeparture(from, to, afterDay)`
Returns the next scheduled departure no earlier than `afterDay`:
```
departures: offset, offset+freq, offset+2×freq, ...
if afterDay ≤ offset: return offset
else: return offset + ceil((afterDay - offset) / frequency) × frequency
```

### Effect on Shipments
When a cargo finishes a leg and arrives at an intermediate port:
1. `getNextDeparture(nextPort.from, nextPort.to, arrivalDay)` is called
2. If `waitDays > 0.05` → ship enters `port_wait` status
3. `totalTimeSpent` keeps accumulating (time passes at port)
4. When `totalTimeSpent >= scheduledDeparture` → ship boards and resumes movement

**This creates:**
- Realistic port dwell time
- Missed connections when upstream delays push arrival past the last vessel
- Cascade propagation through the segment chain

---

## 6. The Shipment Engine (`ShipmentEngine.js`)

The heart of the system. Manages the full lifecycle of every cargo agent.

### 6.1 Spawning a Ship (`spawnShipment`)

When a ship is deployed:
1. **Cargo profile** assigned (General, Perishable, Oil, High Priority)
2. **Priority** (1–5) determines routing weights
3. **Routing weights** biased by cargo + priority → Dijkstra called → path computed
4. **`_buildSegments()`** creates the segment execution chain
5. **`spawnShipmentWithRoute()`** variant: uses a pre-calculated Yen's path chosen by the user
6. If `options.scheduledDepartureDay > 0`: ship immediately enters `port_wait` at origin

### 6.2 Segment Model (`_buildSegments`)
Each path `[A, B, C, D]` becomes:
```
segments = [
  { from: A, to: B, edge, plannedDeparture, plannedArrival, actualDeparture, actualArrival, status, missedConnection, scheduleWait, delay },
  { from: B, to: C, ... },
  { from: C, to: D, ... }
]
```
`plannedDeparture` for segments after index 0 accounts for `scheduleEngine.getNextDeparture()` — so the plan already bakes in expected waiting time.

### 6.3 The Update Loop (60 FPS)

Every frame, `dt` (ms since last frame × simulationSpeed) is processed:

```
forEach(ship):
  if completed: skip
  
  ship.totalTimeSpent += daysPassed      ← universal for ALL active ships
  
  if port_wait:
    waitDaysRemaining = scheduledDeparture - totalTimeSpent
    if totalTimeSpent >= scheduledDeparture:
      boardSeg.actualDeparture = totalTimeSpent
      status = 'moving'   ← boards the vessel
    else: return          ← still waiting
  
  if not moving: return
  
  [freeze guard: null geometry → reroute]
  [blockade guard: dynamic_time >= 900 → reroute]
  
  progressDelta = daysPassed / edge.dynamic_time
  if evading: progressDelta *= 0.4       ← storm arc penalty
  
  progress += progressDelta
  totalDistanceTravelled += daysPassed × 24 × 46 km
  
  if progress >= 1.0:
    completedSeg.actualArrival = totalTimeSpent
    completedSeg.delay = actualArrival - plannedArrival
    completedSeg.status = delayed | completed
    
    currentEdgeIndex++
    
    if finished: status = completed
    else:
      SCHEDULE LOOKUP:
        nextDep = scheduleEngine.getNextDeparture(nextSeg.from, nextSeg.to, totalTimeSpent)
        waitDays = nextDep - totalTimeSpent
        nextSeg.actualDeparture = nextDep
        if arrivalDay > nextSeg.plannedDeparture: missedConnection = true
        if waitDays > 0.05: status = port_wait   ← wait at this port
        else: nextSeg.status = moving (departs immediately)
  
  updatePosition()
  applyGeometricEvasion()
```

### 6.4 Prediction Engine (`_predictSegmentChain`)

Runs forward simulation from current position:
- For each remaining segment: computes `predictedArrival` using `edge.dynamic_time` (live weight)
- For segments not yet started: calls `scheduleEngine.getNextDeparture()` to factor in future waits
- Computes `predictedDelay = predictedArrival - plannedArrival`
- Flags `willMissConnection` when predicted arrival > next segment's planned departure

Outputs:
- `ship.segmentPredictions[]` — per-segment breakdown
- `ship.totalPredictedDelay` — cumulative delay for the entire journey
- `ship._willMissConnection` — boolean risk flag

**This is the core prediction / preemption capability.** It runs continuously, recalculating after every frame for every active ship.

### 6.5 Disruption Evaluation (`evaluateGlobalDisruptions`)

Periodically scans all moving/waiting/port_wait ships:
1. Checks if any edge on the ship's remaining path is now impassable (`dynamic_time >= 900`)
2. Checks if path health has degraded beyond cargo-specific threshold:
   - Oil: reroutes at 110% (very sensitive)
   - Perishable: 115%
   - High Priority: 115%
   - General: 130% (tolerant)
3. Checks `_willMissConnection` and evaluates if rerouting would help
4. If reroute justified → `_handleReroute(ship)`

### 6.6 Rerouting (`_handleReroute`)

1. Re-runs Dijkstra from `ship.currentNode` to `ship.destination` with current dynamic weights
2. Sets the new path, edges, resets progress to 0
3. Clears port_wait state (ship departs on new path immediately)
4. Rebuilds segment chain from current `totalTimeSpent`
5. Increments `ship.rerouteCount`
6. Logs with time saved/lost estimate

### 6.7 Geometric Evasion (`_applyGeometricEvasion`)

Every frame, each moving ship checks all active `GEOGRAPHIC_DISRUPTION` events:
- If distance from ship to storm centre < storm radius + buffer → evasion activated
- `ship._isEvadingVisually = true` → `progressDelta *= 0.4` (2.5× slower, simulates longer arc)
- Ship's displayed position arcs away from the storm visually
- When clear of storm: `_isEvadingVisually = false`, normal speed resumes

### 6.8 Ship Status States

| Status | Meaning |
|--------|---------|
| `moving` | Actively traversing an edge |
| `port_wait` | Docked at intermediate port awaiting scheduled vessel |
| `waiting` | Predictive AI hold (storm wait decision) |
| `rerouting` | Computing new path |
| `completed` | Reached destination |
| `delayed` | Segment completed but arrived late |

---

## 7. Event Engine (`EventEngine.js`)

Manages all active disruptions that mutate the graph in real-time.

### Event Types
```
GEOGRAPHIC_DISRUPTION   → circular storm/anomaly on the map
NODE_DISRUPTION         → specific port closed/degraded
REGION_DISRUPTION       → entire region (e.g., "Middle East") affected
EDGE_DISRUPTION         → specific route blocked (Suez Canal)
```

### How Events Work
Each event has a **rule** defining:
- Which edges/nodes it affects
- How it scales `dynamic_time/cost/risk` as a multiplier
- Severity: `moderate | warning | critical | blocked` (blocked = impassable)

When an event fires:
1. Matched edges get `dynamic_time = base_time × rule.multiplier`
2. `blocked` severity → `dynamic_time = 999` (impassable for Dijkstra)
3. `ShipmentEngine.evaluateGlobalDisruptions()` is triggered immediately

### Suez Canal Blockade
Special named event: sets both the northbound and southbound Suez edges to `dynamic_time = 999`. Ships currently on those edges reroute. Ships approaching reroute. Ships waiting reroute. All computed within 5 real seconds.

### Geographic Events (Storms)
Drawn as coloured circles on the map. Ship evasion is handled geometrically — the event position + radius is read every frame by `_applyGeometricEvasion`.

### `update(dt)`
Events have a duration. Every frame, elapsed time is accumulated. When an event expires, edges are reset to `base_*` values and the graph normalises.

---

## 8. Live Intelligence Agent (`LiveIntelligenceAgent.js`)

Periodically auto-injects disruptions based on simulated "live feeds":
- Randomly selects event types
- Fires them into EventEngine
- Simulates the IRL Feed tab showing news-style alerts

---

## 9. The Map Renderer (`MapRenderer.js`)

Built on **Leaflet.js** with **CartoDB Dark Matter** tile layer.

### Port Markers
- `L.circleMarker` at each port's lat/lng
- Scales with zoom level
- Click → `PortSidebar.showPortDetails(portId)`
- Highlighted green when active port selected

### Edge Lines (Sea Routes)
- Drawn via **searoute-js** (actual maritime path-finding that avoids land)
- Fallback: bezier arc if searoute fails (trans-Pacific routes)
- Geometry stored on `edge.geometry` for use by ShipmentEngine
- Bidirectional geometry sharing: reverse edge copies geometry so no ship ever freezes on a null-geometry edge

### Ship Markers
- `L.marker` with custom `divIcon` (coloured glowing dot)
- Updates position every frame → smooth real-time movement
- **Colour codes:** Blue=moving, Purple=port_wait, Yellow=waiting, Red=rerouting, Magenta=evading, Orange=degraded

### Ship Click → Route Visualization
- Click a ship → `showShipRoute(ship)` draws the full path:
  - ✅ Green = completed legs
  - 🔵 Cyan (thick) = current leg
  - ⬜ Dashed grey = upcoming legs
  - Port dots: 🟣 origin, 🟡 intermediate, 🔴 destination
- Dark glassmorphism popup: cargo, hop chain, elapsed days, predicted delay, reroute count, boarding countdown

### Route Planner Highlights
- Draws K-shortest paths in distinct colours (green solid, amber dashed, orange dotted)
- Highlights port nodes involved in each path

---

## 10. UI Components

### 10.1 NavSidebar
3-tab left navigation:
- **🧪 Simulation Sandbox** — main control panel
- **🌍 Real-World Feed** — IRL disruption news
- **🗓️ Schedule Board** — flight-board view

Switching tabs (except Schedule Board) wipes active ships and events so each session starts clean.

### 10.2 SandboxDashboard

**Simulation Controls:**
- Speed slider (0–5×) → scales `window.simulationSpeed` → `dt` in game loop

**Disruption Controls:**
- Suez Canal Block/Unblock toggle
- Storm spawner (click map to place, define radius + severity)
- Port blockade / piracy zone injectors

**Route Planner:**
1. Select Origin port (all 26 ports available)
2. Select Destination port (auto-excludes origin)
3. Select Cargo Type → biases routing weights
4. Select Priority (1–5) → further biases weights
5. Set Departure Time:
   - 🟢 Now (immediate)
   - ⏱️ Schedule: enter sim-hours + sim-minutes → shows real-time equivalent
6. Calculate → Yen's K=3 paths computed
7. Route cards shown: hop chain, ⏱️ days, 💰 cost, ⚠️ risk, hop count
8. Deploy → spawns ship on exact chosen path

### 10.3 TelemetryPanel

Floating panel (bottom of screen) showing all active ships as agent cards:
- Status badge (colour-coded)
- Distance travelled, days elapsed, reroute count
- Wait reason + boarding countdown (if port_wait)
- **Segment Chain visualiser:** icons (✅ 🕒 ⚠️ ⚡ 📅) for each hop, colour-coded by status
- Predicted delay + missed connection warnings

### 10.4 ScheduleBoard (3rd tab)

Flight-board table for every active shipment:
- Per-segment rows showing:
  - **Seg N** badge (animated purple pulse if port_wait)
  - Route: `From Port → To Port`
  - Planned Departure (and actual if stamped)
  - Planned Arrival (and actual + on-time/late indicator)
  - Duration + schedule wait badge
  - **Dependency column:** 🟢 FREE (first leg) | 🔗 Awaits Seg N | ✅ Seg N arrived
  - Missed connection flag
- Summary bar: km, days, reroutes, connection risk, boarding countdown
- Auto-refreshes every 1.5 seconds

---

## 11. Simulation Clock

Displayed as a **glassmorphism pill** pinned top-centre of the map (`z-index: 2000`).

**Mechanics:**
- Page load captures `window._simStartEpoch = Date.now()`  
- Game loop accumulates `window.simulationElapsedDays += dt / 30000`
  - `dt` is already speed-scaled → clock respects speed slider
- Clock widget reads `simulationElapsedDays`, converts to `startEpoch + elapsedMs`, formats as `DD Month YYYY HH:MM`
- **Scale:** 1 real second = 48 simulation minutes (at 1× speed), i.e. **1 sim day = 30 real seconds**
- No seconds shown — just date + HH:MM for clarity

---

## 12. Time-Based Scheduling — The Full Flow

```
User clicks "Deploy This Route" (with 6h delay)
  ↓
Ship spawns at Suez port in port_wait status
  ↓
simulationElapsedDays ticks forward (30 real seconds per sim day)
  ↓
After ~7.5 real seconds: ship.scheduledDeparture reached
  ↓
Ship boards → status = 'moving' → Seg 1 starts
  ↓
Ship travels Suez → Rotterdam (2.4 sim days = ~72 real seconds)
  ↓
Arrives Rotterdam → scheduleEngine.getNextDeparture(Rotterdam, Hamburg, arrivalDay)
  ↓
Next vessel departs in 0.8 sim days → status = port_wait
  ↓
Wait 24 real seconds
  ↓
Board Rotterdam → Hamburg vessel → Seg 2 starts
  ↓
... (continues until destination)
```

Meanwhile, every frame:
```
_predictSegmentChain(ship) runs:
  → predicts Hamburg arrival will be +1.2d late
  → Hamburg→NewYork connection at risk
  → ship._willMissConnection = true
  → evaluateGlobalDisruptions picks this up
  → auto-reroutes to Hamburg→Rotterdam→NewYork (shorter wait)
```

---

## 13. What Makes This "Preemptive"

The critical differentiator:

1. **Events mutate `dynamic_time` on edges the moment they fire**
2. **`_predictSegmentChain()` runs every frame** using those live dynamic weights
3. **`evaluateGlobalDisruptions()` sees the degraded prediction** and triggers rerouting
4. **Rerouting happens before the ship physically reaches the disrupted edge**

The ship never enters the storm. The ship never waits for a missed connection. The system saw it coming and redirected.

---

## 14. Key Numbers Summary

| Metric | Value |
|--------|-------|
| World ports modelled | 26 |
| Sea routes (edges) | ~60+ bidirectional |
| Routing algorithm | Yen's K=3 + Dijkstra |
| Prediction lookahead | Full remaining segment chain |
| Cargo types | 4 (General, Perishable, Oil, High Priority) |
| Priority levels | 5 |
| Reroute volatility | Cargo-specific (110%–130%) |
| Sim time scale | 1 day = 30 real seconds |
| Frame rate | 60 FPS (requestAnimationFrame) |
| Schedule frequency | Every 0.5–3.5 sim days per route |

---

## 15. What Still Needs Building

| Feature | Gap It Closes |
|---------|--------------|
| **Live Alert Feed** | Makes the intelligence *visible* to judges |
| **Reroute Impact chip** | Quantifies the benefit (saved time/cost) |
| **KPI bar** (under clock) | Judges need a number — ships active, alerts, reroutes |
| **Cascade Demo button** | Makes the demo foolproof and dramatic |
