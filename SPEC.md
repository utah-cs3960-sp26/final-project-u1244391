# Party Pack
### Software Design & Technical Specification
*Games: Wavelength | Chameleon*
**Version 1.0 — Final Project**

---

## 1. Project Overview

Party Pack is a browser-based real-time multiplayer party game platform hosting two social deduction and estimation games: Wavelength and Chameleon. Players join shared rooms via a 4-letter code on any device — no account required. The entire stack is free and deployable to Render.

### 1.1 Goals

- **Real-time multiplayer** — all players see updates instantly via WebSockets
- **Device agnostic** — works on phones, tablets, and desktops in any browser
- **Zero cost** — every library, service, and host is free tier or open source
- **Extensible** — architecture allows additional games to be added easily

### 1.2 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Real-time | Socket.io v4 (client + server) |
| Backend | Node.js + Express v4 |
| Database | Supabase (free tier PostgreSQL) |
| Hosting — Client | Render Static Site |
| Hosting — Server | Render Web Service (Node) |
| Keep-Alive | UptimeRobot (free ping) |

---

## 2. App Gameflow & Navigation

The app opens to a **main screen** featuring the Party Pack title and four selectable boxes:

1. **Chameleon** — playable game
2. **Wavelength** — playable game
3. **New Games Coming Soon** — unclickable placeholder
4. **Credits** — navigates to a credits page

Each game has a slight theme change to visually differentiate it from the others.

### 2.1 Host Flow

Inside each game, there are two options: **Join** or **Host**.

When a player selects **Host**:
1. They are prompted to enter a name.
2. They are taken to the **Host Screen**, which includes:
   - A **game code** displayed in the top right corner (auto-generated)
   - Options to **Start Game** or **End Game**
   - A **Choose Theme** option (Chameleon only)

### 2.2 Join Flow

When a player selects **Join**:
1. They are presented with a field for the **room code** and their **player name**.
2. After entering both, they are assigned a random available color and enter the lobby to wait for the host to start.

### 2.3 Game Start

Once the host presses **Start Game**, the game loop begins and all connected players are taken into the active game.

---

## 3. Folder Structure

```
party-pack/
├── client/                  # React + Vite frontend
│   ├── public/
│   └── src/
│       ├── components/      # Shared UI: Button, Card, PlayerList, Timer
│       ├── context/
│       │   └── GameContext.jsx   # Global state: player, room, phase
│       ├── hooks/
│       │   ├── useSocket.js      # Socket wrapper — all games use this
│       │   └── useRoom.js        # Room join/create logic
│       ├── pages/
│       │   ├── Home.jsx          # Enter name, create or join room
│       │   ├── Lobby.jsx         # Waiting room, game picker, start button
│       │   └── Game.jsx          # Routes to correct game by type
│       └── games/
│           ├── Wavelength/
│           │   ├── index.jsx     # Phase orchestrator
│           │   ├── Dial.jsx      # Styled range input slider
│           │   ├── ClueGiver.jsx
│           │   └── Guesser.jsx
│           └── Chameleon/
│               ├── index.jsx     # Phase orchestrator
│               ├── Grid.jsx      # Topic keyword grid
│               ├── ClueInput.jsx
│               └── VotePanel.jsx
│
└── server/
    ├── index.js             # Express + Socket.io entry point
    ├── rooms.js             # Room CRUD + broadcastGameState()
    ├── PhaseManager.js      # Reusable phase transition helper
    └── games/
        ├── BaseGame.js      # Abstract base class all games extend
        ├── Wavelength.js
        └── Chameleon.js
```

---

## 4. System Architecture

### 4.1 Shared Room System

The room system is built once and shared by both games. A player creates a room and receives a 4-character uppercase code (e.g. `WXQZ`). Others join by entering that code on the home screen. The server stores all active rooms in memory — no database needed for the demo, but Supabase can optionally persist room state for reconnects.

Room data structure stored on server:
```js
{
  code: 'WXQZ',
  players: [{ id, name, socketId, score, color }],  // color is one of 20 fixed hex values
  host: playerId,
  currentGame: 'wavelength' | 'chameleon',
  game: <BaseGame instance>,
  chat: []   // array of { playerId, name, color, message, timestamp } — resets each match
}
```

### 4.2 BaseGame Class

Every game extends `BaseGame`. This enforces a uniform interface so the socket handler never needs to know game-specific logic. The two methods every game must implement are `handleAction()` and `getStateFor()`.

```js
class BaseGame {
  constructor(roomCode, players)
  nextPhase()           // advances phase, returns new phase
  handleAction(id, action, payload)   // MUST override
  getStateFor(playerId) // MUST override — returns personalized state
  isComplete()          // returns true when phase === 'scores'
}
```

The `getStateFor()` method is critical for security — it ensures secrets like the Chameleon's identity or Wavelength's target position are only sent to players who are allowed to see them.

### 4.3 Socket Event Design

All games communicate through a single generic event pair. This keeps the client/server contract simple and consistent:

| Event | Direction + Purpose |
|---|---|
| `game:action` | Client → Server: player submits an action (clue, guess, vote, etc.) |
| `game:state` | Server → Client: personalized state broadcast after every action |
| `room:update` | Server → All: player joined/left, game started, player profile updated |
| `game:error` | Server → Client: validation error (wrong phase, not your turn) |
| `player:update` | Client → Server: player changes their name or color |
| `player:updated` | Server → All: broadcast updated player profile to all room members |
| `chat:send` | Client → Server: player sends a chat message |
| `chat:message` | Server → All: broadcast new message to all room members |

The server loops through all players and emits `game:state` individually using `getStateFor()` — never broadcasting the same object to all players at once.

### 4.4 Phase State Machine

Both games use a `PhaseManager` to advance through phases consistently. Phases drive what UI is rendered on the client.

```js
class PhaseManager {
  constructor(phases)       // e.g. ['setup','playing','reveal','scores']
  next()                    // advance to next phase
  is(phase)                 // boolean check
  autoAdvance(secs, cb)     // auto-advance after timeout (idle players)
  clearTimers()             // clean up on room destroy
}
```

### 4.5 Race Condition Prevention

All game actions are processed through a serial action queue. This prevents issues when multiple players submit simultaneously (e.g. two votes arriving at the same millisecond).

```js
handleAction(playerId, action, payload) {
  this.actionQueue.push({ playerId, action, payload });
  this._processNext();
}

_processNext() {
  if (this.processing || !this.actionQueue.length) return;
  this.processing = true;
  const item = this.actionQueue.shift();
  this._dispatch(item);
  this.processing = false;
  this._processNext();
}
```

---

## 5. Game 1 — Wavelength

One randomly selected player is the **Clue Giver** for the entire game. Each round a random **scale** is shown to all players — a spectrum with a label on each end (e.g. *Boring ⟷ Exciting*). The backend secretly places a target value on the 0–180 internal dial, visible only to the Clue Giver. The Clue Giver thinks of something that belongs somewhere on that scale and types their answer. Once submitted, all other players drag their own dial to where they believe that answer falls. After everyone locks in their guess, the round results screen shows the target, all player guesses as lines on the dial, and a per-round score breakdown from highest to lowest. The host advances to the next round. After 4 rounds a final leaderboard crowns the winner and players return to the host room.

### 5.1 Scale Prompts

Each round uses a **scale** — two opposing labels that define the ends of the spectrum. The Clue Giver reads the scale and thinks of something that falls at the exact position the target marks. All players see the scale during both the clue-giving and guessing phases. The backend stores the full prompt list and picks one randomly per round without repeating within the same game session.

**Display format:** `[Left Label] ⟷ [Right Label]`

The full prompt list (stored in `/server/data/wavelengthScales.json`):

```json
[
  { "left": "Would NOT introduce my grandma to", "right": "Would introduce my grandma to" },
  { "left": "Completely useless", "right": "Extremely useful" },
  { "left": "Cheap", "right": "Expensive" },
  { "left": "Boring", "right": "Exciting" },
  { "left": "Risky", "right": "Safe" },
  { "left": "Ugly", "right": "Beautiful" },
  { "left": "Dumb idea", "right": "Genius idea" },
  { "left": "Casual", "right": "Formal" },
  { "left": "Low effort", "right": "High effort" },
  { "left": "Forgettable", "right": "Unforgettable" },
  { "left": "Bad habit", "right": "Good habit" },
  { "left": "Lazy", "right": "Productive" },
  { "left": "Unhealthy", "right": "Healthy" },
  { "left": "Weird", "right": "Normal" },
  { "left": "Illegal", "right": "Totally legal" },
  { "left": "Soft", "right": "Hard" },
  { "left": "Cold", "right": "Hot" },
  { "left": "Would survive a zombie apocalypse", "right": "Dies immediately" },
  { "left": "Smells terrible", "right": "Smells amazing" },
  { "left": "Looks edible", "right": "Definitely looks not edible" },
  { "left": "Gives good advice", "right": "Gives terrible advice" },
  { "left": "Peak confidence", "right": "Zero confidence" },
  { "left": "Totally trustworthy", "right": "Absolutely suspicious" },
  { "left": "Would win reality TV", "right": "First one out" },
  { "left": "Would clap when the plane lands", "right": "Judges people who clap" },
  { "left": "Could fix it", "right": "Makes it worse" },
  { "left": "Looks like it would taste good", "right": "Looks like it would taste awful" },
  { "left": "Should exist", "right": "Should NOT exist" },
  { "left": "Better in theory", "right": "Better in practice" },
  { "left": "Makes life easier", "right": "Makes life harder" },
  { "left": "High IQ", "right": "Street smart" },
  { "left": "Sounds fake", "right": "Sounds real" },
  { "left": "Makes sense", "right": "Makes zero sense" },
  { "left": "Would ruin a party", "right": "Makes the party" },
  { "left": "Would get you in trouble", "right": "Completely acceptable" },
  { "left": "Mild inconvenience", "right": "Absolute disaster" },
  { "left": "Feels wrong", "right": "Feels right" },
  { "left": "Would do again", "right": "Never again" },
  { "left": "Easy to hide", "right": "Impossible to hide" },
  { "left": "Harmless prank", "right": "Ends a friendship" },
  { "left": "Revolutionary", "right": "A fad" },
  { "left": "Should be a sport", "right": "Should be illegal" },
  { "left": "Tastes like 'Yellow'", "right": "Tastes like 'Blue'" },
  { "left": "Overrated", "right": "Underrated" },
  { "left": "Worth the hype", "right": "Total scam" },
  { "left": "Comforting", "right": "Unsettling" }
]
```

### 5.2 Game Phases

| Phase | What Happens |
|---|---|
| `setup` | Clue Giver randomly assigned; round 1 target (0–180 internal) and scale randomly selected |
| `giving-clue` | All players see the scale labels on either end of the dial; only the Clue Giver sees the target marker; Clue Giver types their answer and submits |
| `guessing` | Clue Giver's answer is revealed to all players; all other players drag their dial handle to their best guess and press Confirm |
| `round-reveal` | Target marker shown on the dial; each player's guess rendered as a labeled line on the arc; per-round scores listed below the dial from highest to lowest; host presses Continue |
| `scores` | Final leaderboard shown after round 4; winner announced; host returns everyone to the host room |

Rounds 1–3 cycle: `round-reveal` → `giving-clue` with a new target and new scale. After round 4, the game advances to `scores`.

### 5.3 Game State

```js
{
  phase: 'giving-clue' | 'guessing' | 'round-reveal' | 'scores',
  clueGiverId: 'abc123',
  currentRound: 1,              // 1–4
  totalRounds: 4,
  scale: {
    left: 'Boring',
    right: 'Exciting'
  },
  targetPosition: 134,          // 0–180 internally, NEVER sent to guessers before round-reveal
  clueGiverAnswer: 'Skydiving', // null until Clue Giver submits
  guesses: {
    playerId1: 120,
    playerId2: 148,
    playerId3: 101
  },
  roundScores: {                // populated after all guesses in; sorted desc for display
    playerId1: 5,
    playerId2: 3,
    playerId3: 1
  },
  totalScores: {
    playerId1: 12,
    playerId2: 8,
    playerId3: 5
  },
  usedScaleIndices: [3, 11, 27] // tracks which scales have been used this game to prevent repeats
}
```

### 5.4 Displayed Score vs. Internal Position

The internal dial range is **0–180** and all server-side calculations (target, guesses, distance) use this range. However, the **score displayed to players is mapped to 0–100** for simplicity. The conversion is purely cosmetic — applied only at the display layer:

```js
// Display conversion (frontend only)
const displayScore = Math.round((internalPosition / 180) * 100);
```

Scale labels remain anchored to the 0 and 180 endpoints of the arc visually. Players interact with and see a 0–100 scale on screen while all game logic runs on 0–180 internally.

### 5.5 Round Reveal Screen

After all guesses are submitted, the `round-reveal` phase shows:

1. **The dial** — target marker revealed, plus a labeled line for each player's guess rendered on the arc at their submitted position. Each line is colored with that player's assigned room color and shows their name.
2. **Score breakdown** — listed below the dial, sorted from highest score to lowest for the round. Each row shows: player avatar (color + initials), name, round points earned, and cumulative total.
3. **Continue button** — visible only to the host. Pressing it advances to the next round or to the final leaderboard if round 4 is complete.

Non-host players see a "Waiting for host..." indicator instead of the Continue button.

### 5.6 Personalized State (getStateFor)

`targetPosition` is sent **only to the Clue Giver** during `giving-clue` and `guessing`. It is sent to **all players** once the phase is `round-reveal`. The Clue Giver's answer is withheld from all players (including the Clue Giver in their broadcast) until the `guessing` phase begins.

### 5.7 Socket Actions

| Action | Payload + Who Sends It |
|---|---|
| `submitAnswer` | `{ answer: string }` — Clue Giver only, during `giving-clue` |
| `submitGuess` | `{ position: 0–180 }` — all guessers, during `guessing`; Clue Giver does not submit |
| `nextRound` | `{}` — host only, advances from `round-reveal` to next round or `scores` |

### 5.8 Dial Component

The dial is rendered as a **half-circle (180°)** using SVG. The left and right scale labels are anchored to each end of the arc. Key behaviors:

- **Clue Giver view (`giving-clue`):** Target marker shown at its true position; Clue Giver sees exactly where on the scale they need to aim their answer.
- **Guesser view (`guessing`):** No target marker visible; player drags a handle freely around the arc and presses **Confirm** to lock in. The handle position is displayed as a 0–100 value for player-facing feedback.
- **Reveal view (`round-reveal`):** Target marker shown; each player's guess rendered as a thin colored line extending from the center of the arc outward at their submitted angle, labeled with their name in their color.

> Build and test the dial with a hardcoded target and hardcoded guesses before wiring socket logic. Confirm needle/line rendering works on mobile (375px minimum width).

### 5.9 Scoring

Distance is calculated on the **internal 0–180 scale**. Points per round:

| Distance from Target (internal 0–180) | Points |
|---|---|
| Within 9 — perfect | 5 points |
| Within 18 | 4 points |
| Within 36 | 3 points |
| Within 54 | 2 points |
| Within 72 | 1 point |
| More than 72 away | 0 points |

These thresholds correspond roughly to within 5, 10, 20, 30, and 40 on the displayed 0–100 scale, keeping the feel consistent with what players see. Scores from all 4 rounds are summed. The player with the highest total at the end of round 4 wins.

---

## 6. Game 2 — Chameleon

The host selects a **theme** before the game starts (e.g. Movies, Sports, Celebrities). The backend uses that theme to randomly pick a **secret word** from a large stored word list for that category. All players except the Chameleon are shown the word at the top of their screen. The Chameleon's screen simply tells them they are the Chameleon — no word is shown. Players then take turns giving one-word hints, going around the group **3 full times** (3 hints per player total). After all hints are in, everyone votes on who they think the Chameleon is. If the Chameleon avoids being voted out they win. If they are caught, they get one redemption chance to guess the secret word — a correct guess is a draw. The game then resets to the host room where the theme can be changed and new players can join before the next round.

### 6.1 Theme Selection & Word Lists

The host selects a theme on the host screen before pressing Start Game. The selected theme is saved to the room state on the backend. Each theme has its own large word list (aim for 50+ words per theme to prevent repeats). Available themes:

- **Movies** — e.g. Titanic, Inception, Shrek, The Godfather, Toy Story…
- **College Majors** — e.g. Psychology, Engineering, Nursing, Finance, Philosophy…
- **Sports** — e.g. Basketball, Soccer, Tennis, Swimming, Wrestling…
- **Celebrities** — e.g. Taylor Swift, LeBron James, Elon Musk, Beyoncé…
- **Video Games** — e.g. Minecraft, Fortnite, Zelda, Mario Kart, FIFA…

Word lists are stored as static JSON files on the server (`/server/data/chameleonWords.json`) keyed by theme name. On game start, the backend picks one word randomly from the selected theme's list.

```json
{
  "Movies": ["Titanic", "Inception", "Shrek", "The Godfather", "Toy Story", "..."],
  "Sports": ["Basketball", "Soccer", "Tennis", "Swimming", "Wrestling", "..."],
  "..."
}
```

### 6.2 Game Phases

| Phase | What Happens |
|---|---|
| `setup` | Theme already selected; backend picks keyword; Chameleon assigned randomly |
| `clues` | Players give one-word hints one at a time, 3 full rounds around the group |
| `voting` | All hints visible; all players simultaneously vote for who they think the Chameleon is |
| `redemption` | If Chameleon receives majority vote, they get one chance to guess the secret word |
| `reveal` | Chameleon identity shown, votes shown, redemption result shown (if applicable) |
| `lobby` | Game resets; players returned to host room; host may change theme or start again |

### 6.3 Hint Turn Structure

Hints go in **player order**, one at a time, cycling **3 full times** around the group. The active player's card is highlighted on all screens. Only the active player sees the hint input field — all other players wait.

- When a player submits their hint, their **player card** becomes highlighted and displays their hint word visibly to everyone.
- The next player in order is then activated.
- This continues until every player has submitted 3 hints (total hints = `numPlayers × 3`).
- Once all hints are in, the game automatically advances to the `voting` phase.

Turn order is determined at `setup` and remains fixed for the entire clue phase.

### 6.4 Voting Rules

- All players vote simultaneously — each player selects one other player as their Chameleon suspect.
- A player cannot vote for themselves.
- The Chameleon wins outright if they do **not** receive the majority of votes (i.e. someone else gets more votes, or there is a tie not in the Chameleon's favor).
- If the Chameleon receives the **strict majority** (more votes than any other player), they are caught and proceed to the `redemption` phase.

### 6.5 Redemption Phase

If caught, the Chameleon is shown a text input and has **one attempt** to guess the secret word. Matching is **case-insensitive** and ignores leading/trailing spaces.

- **Correct guess** → Draw. No points awarded to either side.
- **Incorrect guess** → All non-Chameleon players win.

### 6.6 Game State

```js
{
  phase: 'clues' | 'voting' | 'redemption' | 'reveal' | 'lobby',
  theme: 'Movies',
  keyword: 'Inception',         // hidden from chameleon; never sent in getStateFor() until reveal
  chameleonId: 'abc123',        // never sent until reveal
  turnOrder: ['p1','p2','p3'],  // fixed player order
  currentTurn: 'p2',            // whose turn it is to submit a hint
  currentRound: 2,              // 1–3
  hints: [
    { playerId: 'p1', round: 1, hint: 'dreams' },
    { playerId: 'p2', round: 1, hint: 'layers' }
  ],
  votes: { p1: 'p3', p2: 'p3', p3: 'p1' }, // hidden until reveal
  redemptionGuess: null,
  redemptionSuccess: null,      // true | false | null
  outcome: null                 // 'chameleon_wins' | 'players_win' | 'draw' | null
}
```

### 6.7 Personalized State (getStateFor)

| Player | What They See |
|---|---|
| Regular player (`clues` phase) | Secret word displayed at top of screen; all submitted hint cards; input only when it's their turn |
| Chameleon (`clues` phase) | "You are the Chameleon" displayed at top; all submitted hint cards; input only when it's their turn |
| Active player (`clues` phase) | Their hint input field is enabled; all others see a "waiting" state |
| All players (`voting` phase) | All hint cards visible; vote buttons for each other player |
| Chameleon (`redemption` phase) | Text input to guess the keyword |
| All players (`reveal` phase) | Chameleon identity, all votes, redemption result, outcome |

> **Security:** `keyword` and `chameleonId` are **never** included in `getStateFor()` output until the `reveal` phase. `votes` are also hidden until `reveal`.

### 6.8 Socket Actions

| Action | Payload + Who Sends It |
|---|---|
| `submitHint` | `{ hint: string }` — active player only, during `clues` |
| `submitVote` | `{ targetId: playerId }` — all players, during `voting` |
| `submitRedemption` | `{ guess: string }` — Chameleon only, during `redemption` |

### 6.9 Outcome Summary

| Result | Who Wins |
|---|---|
| Chameleon not voted out (majority elsewhere or tie) | Chameleon wins |
| Chameleon voted out + redemption correct | Draw |
| Chameleon voted out + redemption incorrect | All other players win |

---

---

## 7. Lobby — Player Customization

### 7.1 Player Color Assignment

When a player joins a room they are automatically assigned a random color from a fixed palette of **20 options**. No two players in the same room can share a color at the same time.

The palette is stored as a constant on the server:

```js
const PLAYER_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#FB923C', // Amber-Orange
  '#34D399', // Emerald
  '#60A5FA', // Light Blue
  '#F472B6', // Light Pink
  '#A3E635', // Yellow-Green
  '#FBBF24', // Amber
];
```

On join, the server picks a random color from the list of colors **not currently in use** by any other player in that room and assigns it. If all 20 colors are somehow taken (20+ players), assignment falls back to the first available slot — this edge case should be handled gracefully without crashing.

### 7.2 Edit Player Profile (Name & Color)

Each player in the lobby sees their own card with an **Edit** button. Clicking Edit opens an inline edit mode on their card with:

- A **name text input** pre-filled with their current name
- A **color picker grid** showing all 20 palette swatches, with taken colors visually grayed out/disabled and the player's current color highlighted

**Name update rules:**
- The name updates and broadcasts to all players when the user presses **Enter** or **clicks/taps outside** the input field (on blur).
- Empty names are rejected — the field reverts to the previous name.
- Name changes are reflected immediately on all other players' lobby screens.

**Color update rules:**
- Only available (unselected) colors can be clicked.
- When a player selects a new color, the server immediately frees their old color and marks the new color as taken.
- The full updated player list (with new color assignments) is broadcast to all players in the room via `room:update`.
- The color picker reflects the live availability state — if another player grabs a color while someone has the picker open, that swatch becomes disabled in real time.

### 7.3 Game-Start Race Condition

If the host starts the game while a player is actively editing their profile (name input focused or color picker open), the client handles this gracefully:

- The edit UI is immediately dismissed/closed on the client side when a `room:update` event with `status: 'game_started'` is received.
- Any unsaved name change in progress is **discarded** — the player keeps their last confirmed name.
- The player is transitioned into the game with whatever name and color were last confirmed on the server.
- No error is shown; the transition is seamless.

### 7.4 Server-Side Player Update Handling

When the server receives a `player:update` event:

1. Validate the payload — reject empty names, reject colors already taken by another player.
2. If a color change is requested, free the old color in the room's taken-color set and claim the new one.
3. Update the player object in the room's `players` array.
4. Emit `player:updated` to all sockets in the room with the full updated `players` array.

```js
// player:update payload
{ name: string, color: string }  // either or both fields may be present

// player:updated broadcast
{ players: [{ id, name, color, socketId, score }] }
```

### 7.5 Lobby UI Layout

The lobby screen shows:

- Room code displayed prominently (so late joiners can share it)
- A scrollable list of **player cards**, each showing the player's colored avatar circle (initials), their name, and an Edit button (only visible on the player's own card)
- Host-only controls at the bottom: **Start Game** button, and (for Chameleon) **Choose Theme** dropdown
- The **live chat panel** (see Section 8) rendered alongside or below the player list

---

## 8. Live Chat

### 8.1 Overview

A live chat panel is available in the following screens across both games:

| Screen | Both Games |
|---|---|
| Lobby (waiting for host to start) | ✅ |
| End-game results / leaderboard | ✅ |
| Wavelength round result (between rounds) | ✅ (Wavelength only) |

Chat is **room-scoped** — only players in the same room see the same chat. Chat history is **match-scoped** — it is cleared every time the host starts a new game (i.e. when the game transitions from `lobby` back into `setup`). Players cannot see messages from a previous match once a new one begins.

### 8.2 Message Format

Each message is stored and rendered with the sender's name in their assigned color so players are visually identifiable at a glance.

```js
// Chat message object
{
  playerId: 'abc123',
  name: 'Jordan',
  color: '#3B82F6',
  message: 'good luck everyone',
  timestamp: 1713000000000
}
```

Rendered display format: **Jordan** (in blue): good luck everyone

The player's name is rendered in their `color` hex value. The message text uses the default text color.

### 8.3 Chat Reset Behavior

The chat array lives on the room object on the server (`room.chat`). It is reset to `[]` at the moment the host presses **Start Game** — before any `game_started` broadcast is sent. This means players arrive at the first game screen with a clean chat and no carryover from the lobby.

When players return to the host room after a game ends, they start again with an empty chat. Each match gets its own clean slate.

### 8.4 Socket Events

| Event | Payload | Direction |
|---|---|---|
| `chat:send` | `{ message: string }` | Client → Server |
| `chat:message` | `{ playerId, name, color, message, timestamp }` | Server → All in room |

The server appends the full player metadata (name, color) when broadcasting — clients never send their own name or color with a message to prevent spoofing.

Message length is capped at **200 characters** on the server. Messages exceeding this are truncated before broadcast.

### 8.5 Chat UI

- The chat panel renders as a scrollable message list with the input field pinned at the bottom.
- New messages auto-scroll the list to the bottom.
- The sender's name is displayed in their color, bold, followed by a colon and the message text.
- The input submits on **Enter** (not Shift+Enter). Shift+Enter is ignored (no multiline).
- The input field is cleared after a successful send.
- Messages sent by the local player may be visually distinguished (e.g. slightly different background) but must still show the name+color prefix for consistency.
- On mobile the chat panel should not obscure game controls — it should be collapsible or scroll independently.

### 8.6 Where Chat Is NOT Available

Chat is intentionally absent during active gameplay phases to keep players focused:

- Chameleon: `clues`, `voting`, `redemption` phases
- Wavelength: `giving-clue`, `guessing` phases

It reappears on the `reveal` / `scores` / round result screens as defined in Section 8.1.

---

## 9. Frontend Design

### 9.1 Routing

| Route | Purpose |
|---|---|
| `/` | Enter name, create or join room |
| `/lobby/:code` | Waiting room, game picker, host starts |
| `/game/:code` | Active game — renders Wavelength or Chameleon |

### 9.2 GameContext

A single React context holds all shared state so no prop drilling is needed across deeply nested game components.

```js
const GameContext = {
  player: { id, name, color },
  room: { code, players, host },   // players array includes { id, name, color }
  gameType: 'wavelength' | 'chameleon',
  gameState: { ...personalized state from server },
  chat: [{ playerId, name, color, message, timestamp }],
  sendAction: (action, payload) => void,
  sendChat: (message) => void
}
```

### 9.3 useSocket Hook

Wraps all Socket.io logic. Every component calls `sendAction()` — nothing touches the socket directly.

```js
const { sendAction } = useSocket(roomCode, playerId, onStateUpdate);

// Usage in any game component:
sendAction('submitClue', { clue: 'misty' });
```

### 9.4 UI Philosophy

- Bold typography and color — no sprites, icons, or art assets needed
- Each game has its own accent color: **Wavelength = Indigo**, **Chameleon = Emerald**
- Player avatars are colored circles with initials — no images
- Tailwind CSS for all styling — no custom CSS files
- Tested on mobile: large tap targets, no cramped grids below 375px wide

### 9.5 Phase-Driven Rendering

Each game's `index.jsx` reads the phase from `gameState` and renders the correct sub-component:

```jsx
// Wavelength/index.jsx
if (phase === 'giving-clue' && isClueGiver) return <ClueGiver />;
if (phase === 'giving-clue' && !isClueGiver) return <WaitingForClue />;
if (phase === 'guessing') return <Guesser />;
if (phase === 'reveal') return <Reveal />;
if (phase === 'scores') return <Scores />;
```

---

## 10. Deployment — Render

### 10.1 Overview

The client and server are deployed as two separate Render services. Anyone with the room code can join via a browser on any device — no install required.

### 10.2 Server — Web Service

- Runtime: Node.js
- Build Command: `npm install`
- Start Command: `node server/index.js`
- Environment Variable: `PORT` (Render sets this automatically)
- Free tier: 512MB RAM, sleeps after 15 min inactivity

### 10.3 Client — Static Site

- Build Command: `npm run build`
- Publish Directory: `client/dist`
- Environment Variable: `VITE_SERVER_URL = https://your-server.onrender.com`
- Free tier: unlimited bandwidth for static assets

### 10.4 Keep-Alive (Critical for Demo Day)

Render's free tier sleeps after 15 minutes of inactivity. A cold start takes 30–60 seconds which will break a live demo. Fix this with UptimeRobot:

1. Add a `/health` route to `server/index.js` that returns `{ status: 'ok' }`
2. Sign up at uptimerobot.com (free)
3. Create a monitor: HTTP, your Render URL + `/health`, every 5 minutes
4. Server stays awake indefinitely

### 10.5 CORS Configuration

```js
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
```

---

## 11. All Packages & Libraries

### 11.1 Client (client/package.json)

| Package | Version | Purpose |
|---|---|---|
| react | ^18.2.0 | UI framework |
| react-dom | ^18.2.0 | DOM rendering |
| react-router-dom | ^6.x | Client-side routing |
| socket.io-client | ^4.7.x | WebSocket connection to server |
| tailwindcss | ^3.x | Utility-first CSS styling |
| @vitejs/plugin-react | ^4.x | Vite React plugin |
| vite | ^5.x | Dev server + build tool |
| postcss | ^8.x | Required by Tailwind |
| autoprefixer | ^10.x | Required by Tailwind |

### 11.2 Server (server/package.json)

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.x | HTTP server + routing |
| socket.io | ^4.7.x | WebSocket server |
| cors | ^2.8.x | Cross-origin request handling |
| dotenv | ^16.x | Load .env variables |
| nodemon | ^3.x (dev) | Auto-restart on file changes |

### 11.3 External Services (All Free)

| Service | Purpose + Free Tier |
|---|---|
| Render | Host server (Web Service) and client (Static Site) — free tier |
| Supabase | PostgreSQL DB + Auth if needed — 500MB, 50k MAU free |
| UptimeRobot | Ping /health every 5 min to prevent Render cold starts — free |
| GitHub | Source control + connects directly to Render for auto-deploy — free |

---

## 12. Recommended Build Order

Build in this sequence to avoid getting stuck. Each step proves the next one works.

1. **Room system** — create room, join by code, player list syncs live
2. **BaseGame + PhaseManager** — proves the server architecture works
3. **Chameleon** — simplest flow, proves `getStateFor()` privacy works
4. **Wavelength** — introduces personalized state and the dial mechanic
5. **Scoring system** — shared across both games
6. **UI polish** — colors, transitions, mobile responsiveness
7. **Deploy to Render + UptimeRobot** — at least 3 days before demo

---

*Party Pack — All libraries and services are free and open source*
