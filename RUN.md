# Running Party Pack

## Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### 1. Install dependencies

```bash
# From the project root
cd server && npm install
cd ../client && npm install
```

### 2. Start the server

```bash
cd server
npm run dev
```

The server runs at **http://localhost:3001**. You should see `Server listening on port 3001`.

### 3. Start the client

Open a **second terminal**:

```bash
cd client
npm run dev
```

The client runs at **http://localhost:5173**. Open that URL in your browser.

### 4. Play

- Open **http://localhost:5173** in one browser tab (this is the host)
- Open it in a second tab or different browser (this is a player joining)
- Host creates a room → share the 4-letter code → second player joins with the code

---

## Deploy to Render

You need two Render services: a **Web Service** for the server and a **Static Site** for the client.

### 1. Push to GitHub

Make sure your project is pushed to a GitHub repository. Render connects directly to GitHub for auto-deploy.

### 2. Deploy the Server (Web Service)

1. Go to [render.com](https://render.com) and create a **New Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `party-pack-server` (or anything) |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |

4. Add environment variables:

| Variable | Value |
|---|---|
| `CLIENT_URL` | `https://your-client-site.onrender.com` (fill in after creating the static site) |

5. Click **Create Web Service** and note the URL (e.g. `https://party-pack-server.onrender.com`)

### 3. Deploy the Client (Static Site)

1. On Render, create a **New Static Site**
2. Connect the same GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `party-pack-client` (or anything) |
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `client/dist` |

4. Add environment variable:

| Variable | Value |
|---|---|
| `VITE_SERVER_URL` | `https://party-pack-server.onrender.com` (your server URL from step 2) |

5. Click **Create Static Site**

### 4. Update the Server's CLIENT_URL

Go back to your server Web Service on Render and set the `CLIENT_URL` environment variable to your static site URL (e.g. `https://party-pack-client.onrender.com`). This enables CORS.

### 5. Prevent Cold Starts with UptimeRobot

Render's free tier sleeps after 15 minutes of inactivity. To keep it awake:

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Create a new monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://party-pack-server.onrender.com/health`
   - **Interval:** 5 minutes
3. The server will now stay awake indefinitely

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Client can't connect to server | Make sure `VITE_SERVER_URL` is set correctly and the server is running |
| CORS errors in browser console | Make sure `CLIENT_URL` on the server matches your client's URL exactly (no trailing slash) |
| Render deploy fails | Check that **Root Directory** is set to `server` or `client` respectively |
| First load takes 30+ seconds | The free Render server is cold-starting — set up UptimeRobot (step 5) |
