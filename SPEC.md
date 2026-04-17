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
2. After entering both, they enter the lobby and wait for the host to start.

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
  players: [{ id, name, socketId, score }],
  host: playerId,
  currentGame: 'wavelength' | 'chameleon',
  game: <BaseGame instance>
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
| `room:update` | Server → All: player joined/left, game started |
| `game:error` | Server → Client: validation error (wrong phase, not your turn) |

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

One randomly selected player is the **Clue Giver** for the entire game. The backend generates a random target value from **0–180**, represented on a half-circle dial. Only the Clue Giver can see where the target sits on the dial. A question prompt is shown to all players (e.g. *"Give me a candy bar"* or *"Give me a sport"*) — the Clue Giver answers with their response, which is then revealed to everyone. All other players drag their own dial to where they think that answer falls on the 0–180 scale. The closer their guess, the more points they earn. This repeats for **4 rounds total** with a new random target and new question each round. The same Clue Giver is used for all 4 rounds. Points accumulate across rounds and a winner is crowned on the final leaderboard. Players are then returned to the host room.

### 5.1 Question Prompts

Questions are open-ended and opinionated, prompting the Clue Giver to place something on an implied spectrum. The backend stores a pool of prompts and picks one randomly each round. Example prompts include:

- "Give me a **movie**"
- "Give me a **video game**"
- "Give me a **candy bar**"
- "Give me a **home cooked meal**"
- "Give me a **soda**"
- "Give me a **sport**"
- "Give me a **TV show**"
- "Give me a **fast food order**"
- "Give me a **vacation destination**"

The prompt pool should contain at least 30 entries so repeats within a single game session are unlikely.

### 5.2 Game Phases

| Phase | What Happens |
|---|---|
| `setup` | Clue Giver randomly assigned, round 1 target (0–180) and question generated |
| `giving-clue` | Clue Giver sees the dial with the hidden target marked; they read the question and type their answer |
| `guessing` | Clue Giver's answer is revealed to all; all other players drag their dial to guess the target position (0–180) and submit |
| `reveal` | Target position revealed on the dial; each player's guess shown; round scores calculated and added to totals |
| `scores` | Final leaderboard shown after round 4; winner crowned; host returns everyone to the host room |

Rounds 1–3 cycle back from `reveal` → `giving-clue` with a new target and question. After round 4 the game advances to `scores`.

### 5.3 Game State

```js
{
  phase: 'giving-clue' | 'guessing' | 'reveal' | 'scores',
  clueGiverId: 'abc123',
  currentRound: 1,           // 1–4
  totalRounds: 4,
  question: 'Give me a candy bar',
  targetPosition: 134,       // 0–180, hidden from guessers until reveal
  clueGiverAnswer: 'Snickers', // null until submitted
  guesses: {
    playerId1: 128,
    playerId2: 145
  },
  roundScores: {
    playerId1: 4,
    playerId2: 2
  },
  totalScores: {
    playerId1: 7,
    playerId2: 5
  }
}
```

### 5.4 Personalized State (getStateFor)

`targetPosition` is sent **only to the Clue Giver** during the `giving-clue` and `guessing` phases. It is sent to all players during `reveal`. The Clue Giver's answer is hidden from all players until the `guessing` phase begins.

### 5.5 Socket Actions

| Action | Payload + Who Sends It |
|---|---|
| `submitAnswer` | `{ answer: string }` — Clue Giver only, during `giving-clue` |
| `submitGuess` | `{ position: 0–180 }` — all guessers, during `guessing` |
| `nextRound` | `{}` — host only, advances from `reveal` to next round or `scores` |

### 5.6 Dial Component

The dial is rendered as a **half-circle (180°)** using SVG or CSS. It functions like a range input mapped to 0–180. The Clue Giver's view shows a marker at the target position. Guessers see a draggable handle they can position anywhere along the arc before submitting.

> Build and test the dial with a hardcoded target value before wiring up socket logic. Confirm it looks correct on mobile screens (375px wide minimum).

### 5.7 Scoring

Points are awarded per round based on how close each guesser's dial position is to the target:

| Distance from Target | Points |
|---|---|
| Within 5 (perfect) | 5 points |
| Within 12 | 4 points |
| Within 20 | 3 points |
| Within 35 | 2 points |
| Within 50 | 1 point |
| More than 50 away | 0 points |

Scores from all 4 rounds are summed. The player with the highest total at the end wins.

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

## 7. Frontend Design

### 7.1 Routing

| Route | Purpose |
|---|---|
| `/` | Enter name, create or join room |
| `/lobby/:code` | Waiting room, game picker, host starts |
| `/game/:code` | Active game — renders Wavelength or Chameleon |

### 7.2 GameContext

A single React context holds all shared state so no prop drilling is needed across deeply nested game components.

```js
const GameContext = {
  player: { id, name },
  room: { code, players, host },
  gameType: 'wavelength' | 'chameleon',
  gameState: { ...personalized state from server },
  sendAction: (action, payload) => void
}
```

### 7.3 useSocket Hook

Wraps all Socket.io logic. Every component calls `sendAction()` — nothing touches the socket directly.

```js
const { sendAction } = useSocket(roomCode, playerId, onStateUpdate);

// Usage in any game component:
sendAction('submitClue', { clue: 'misty' });
```

### 7.4 UI Philosophy

- Bold typography and color — no sprites, icons, or art assets needed
- Each game has its own accent color: **Wavelength = Indigo**, **Chameleon = Emerald**
- Player avatars are colored circles with initials — no images
- Tailwind CSS for all styling — no custom CSS files
- Tested on mobile: large tap targets, no cramped grids below 375px wide

### 7.5 Phase-Driven Rendering

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

## 8. Deployment — Render

### 8.1 Overview

The client and server are deployed as two separate Render services. Anyone with the room code can join via a browser on any device — no install required.

### 8.2 Server — Web Service

- Runtime: Node.js
- Build Command: `npm install`
- Start Command: `node server/index.js`
- Environment Variable: `PORT` (Render sets this automatically)
- Free tier: 512MB RAM, sleeps after 15 min inactivity

### 8.3 Client — Static Site

- Build Command: `npm run build`
- Publish Directory: `client/dist`
- Environment Variable: `VITE_SERVER_URL = https://your-server.onrender.com`
- Free tier: unlimited bandwidth for static assets

### 8.4 Keep-Alive (Critical for Demo Day)

Render's free tier sleeps after 15 minutes of inactivity. A cold start takes 30–60 seconds which will break a live demo. Fix this with UptimeRobot:

1. Add a `/health` route to `server/index.js` that returns `{ status: 'ok' }`
2. Sign up at uptimerobot.com (free)
3. Create a monitor: HTTP, your Render URL + `/health`, every 5 minutes
4. Server stays awake indefinitely

### 8.5 CORS Configuration

```js
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
```

---

## 9. All Packages & Libraries

### 9.1 Client (client/package.json)

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

### 9.2 Server (server/package.json)

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.x | HTTP server + routing |
| socket.io | ^4.7.x | WebSocket server |
| cors | ^2.8.x | Cross-origin request handling |
| dotenv | ^16.x | Load .env variables |
| nodemon | ^3.x (dev) | Auto-restart on file changes |

### 9.3 External Services (All Free)

| Service | Purpose + Free Tier |
|---|---|
| Render | Host server (Web Service) and client (Static Site) — free tier |
| Supabase | PostgreSQL DB + Auth if needed — 500MB, 50k MAU free |
| UptimeRobot | Ping /health every 5 min to prevent Render cold starts — free |
| GitHub | Source control + connects directly to Render for auto-deploy — free |

---

## 10. Recommended Build Order

Build in this sequence to avoid getting stuck. Each step proves the next one works.

1. **Room system** — create room, join by code, player list syncs live
2. **BaseGame + PhaseManager** — proves the server architecture works
3. **Chameleon** — simplest flow, proves `getStateFor()` privacy works
4. **Wavelength** — introduces personalized state and the dial mechanic
5. **Scoring system** — shared across both games
6. **UI polish** — colors, transitions, mobile responsiveness
7. **Deploy to Render + UptimeRobot** — at least 3 days before demo

---
