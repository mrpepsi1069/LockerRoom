# 🏈 TeamCore Bot — discord.py Edition

A Discord bot for league teams, built in Python using `discord.py`.

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot token from the Discord Developer Portal |
| `DATABASE_URL` | MongoDB connection string |
| `PORT` | HTTP health-check port (default: 3000) |

### 3. Run the bot
```bash
python bot.py
```

Slash commands are synced automatically on startup. `bot.py` is the single entry point — it loads every cog, exposes the `/health` and `/api/stats` HTTP endpoints used for uptime monitoring, and wires up all persistent button/component handling.

---

## Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/ping` | Check latency | Everyone |
| `/help` | Show command list | Everyone |
| `/invite` | Get bot invite link | Everyone |
| `/bold <text>` | Convert text to bold Unicode | Everyone |
| `/randomnumber <min> <max>` | Random number | Everyone |
| `/flipcoin` | Flip a coin | Everyone |
| `/fban` / `/fkick` | Fake ban/kick (joke) | Everyone |
| `/awardcheck` | View awards & rings | Everyone |
| `/suggest` | Submit a suggestion | Everyone |
| `/premium` | View premium pricing | Everyone |
| `/matchmaking` | Open the Core Match Making board | Everyone |
| `/matchmaking-queue` | View who's currently looking for a match | Everyone |
| `/matchmaking-cancel` | Cancel your pending matchmaking request(s) | Everyone |
| `/mutevc` / `/unmutevc` | Mute/unmute voice channel | Staff |
| `/dmmembers` | DM members with selected roles | Coach |
| `/activitycheck` | Create activity check | Manager |
| `/gametime` | Game time attendance poll | Coach |
| `/times` | Multi-slot time poll | Manager |
| `/award` | Give a player an award | Manager |
| `/ring-add` | Grant championship rings (up to 10 players) | Manager |
| `/lineup ...` | Lineup management | Manager |
| `/depthchart ...` | Depth chart management | Coach |
| `/league ...` | League management | Coach |
| `/contract ...` | Player contract management | Coach |
| `/role` / `/unrole` | Assign/remove roles | Admin |
| `/kick` / `/ban` / `/timeout` | Moderation | Admin |
| `/setup` | Configure bot channels & roles | Server Owner |
| `/templateuse` | Apply a server template | Server Owner |
| `/botstats` | View bot statistics | Bot Owner |
| `/guilds` | View all servers | Bot Owner |
| `/join` | Get an invite for a server the bot is in | Bot Owner |
| `/botkick` | Leave a server | Bot Owner |
| `/globalannouncement` | Send a message to every server | Bot Owner |
| `/disableglobalmessages` | Opt a server out of owner pings | Server Owner |

---

## Matchmaking

`/matchmaking` creates (or reuses) a **Core Match Making** channel and posts a board with two game buttons (Football Fusion 3 / Ultimate Football). Clicking a game shows an ephemeral menu — visible only to the person who clicked — to choose a match type (`2v2` through `11v11`) and a time (type `now` for available immediately). Once submitted, the bot checks for someone else already waiting on the same game and match type:

- **Match found** → both players are DMed with each other's info and the request is removed from the queue.
- **No match yet** → the request is added to the queue, posted on the board, and the player is DMed automatically as soon as someone else queues for the same game and match type.

Stale queue entries are cleaned up automatically after 6 hours.

---

## Project Structure

```
TeamCore/
├── bot.py              # Main entry point
├── database.py         # MongoDB wrapper (Motor)
├── config.py            # Constants & settings
├── requirements.txt
├── .env.example
├── cogs/                # Slash commands (one per file)
│   ├── ping.py
│   ├── help.py
│   ├── gametime.py
│   ├── league.py
│   ├── contract.py
│   ├── matchmaking.py
│   └── ...
└── utils/
    ├── embeds.py        # Embed builders
    ├── permissions.py   # Role-based auth
    ├── validation.py    # Input validation
    └── premium.py       # Premium checks
```
