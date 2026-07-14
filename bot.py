"""bot.py — TeamCore Discord Bot (discord.py rewrite)"""

import os
import sys
import asyncio
from aiohttp import web
from dotenv import load_dotenv
import discord
from discord.ext import commands
import database as db

load_dotenv()

# ──────────────────────────────────────────────
# Bot Setup
# ──────────────────────────────────────────────

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.voice_states = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


# ──────────────────────────────────────────────
# Events
# ──────────────────────────────────────────────

@bot.event
async def on_ready():
    print(f"🤖 {bot.user} is online")
    print(f"📊 Servers: {len(bot.guilds)}")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="your team | /help"))
    await db.initialize()
    try:
        synced = await bot.tree.sync()
        print(f"✅ Synced {len(synced)} slash command(s)")
    except Exception as e:
        print(f"❌ Sync error: {e}")


@bot.event
async def on_guild_join(guild: discord.Guild):
    print(f"✅ Joined: {guild.name}")
    await db.create_guild(str(guild.id), guild.name)


@bot.event
async def on_interaction(interaction: discord.Interaction):
    """Log every slash command interaction."""
    if interaction.type == discord.InteractionType.application_command:
        await db.log_command(
            interaction.data.get("name", "unknown"),
            str(interaction.guild_id),
            str(interaction.user.id),
        )

    # Handle league_signup button
    if interaction.type == discord.InteractionType.component:
        cid = interaction.data.get("custom_id", "")
        if cid.startswith("league_signup_"):
            await _handle_league_signup(interaction, cid.split("_")[2])


@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    print(f"❌ Command error: {error}")

    # Bridge into a real dispatched event so cogs (e.g. cogs/logging.py) can
    # react to it via @commands.Cog.listener(). discord.py's app_commands
    # errors otherwise only reach CommandTree.on_error and are never
    # dispatched anywhere else on their own.
    bot.dispatch("app_command_error", interaction, error)

    msg = discord.Embed(title="❌ Error", description="Command failed.", color=0xED4245)
    try:
        if interaction.response.is_done():
            await interaction.followup.send(embed=msg, ephemeral=True)
        else:
            await interaction.response.send_message(embed=msg, ephemeral=True)
    except Exception:
        pass


# ──────────────────────────────────────────────
# League Signup Button Handler
# ──────────────────────────────────────────────

async def _handle_league_signup(interaction: discord.Interaction, role_id: str):
    await interaction.response.defer(ephemeral=True)
    role = interaction.guild.get_role(int(role_id))
    if not role:
        return await interaction.followup.send("❌ League role not found. It may have been deleted.", ephemeral=True)

    member = interaction.user
    if member.get_role(role.id):
        await member.remove_roles(role)
        return await interaction.followup.send(f"✅ You have been removed from **{role.name}**!", ephemeral=True)
    else:
        await member.add_roles(role)
        league = await db.get_league_by_role_id(str(interaction.guild_id), str(role.id))
        try:
            welcome = discord.Embed(
                title="🎉 Welcome to the League!",
                description=f"You've joined **{league['league_name'] if league else role.name}**!",
                color=0x00FF00,
            )
            welcome.add_field(name="🏆 League", value=league["league_name"] if league else role.name, inline=True)
            welcome.add_field(name="🏠 Server", value=interaction.guild.name, inline=True)
            if league and league.get("signup_link"):
                welcome.add_field(name="🔗 League Link", value=f"[Click here]({league['signup_link']})", inline=False)
            welcome.set_footer(text="Good luck and have fun!")
            await member.send(embed=welcome)
        except Exception:
            pass
        return await interaction.followup.send(f"✅ You've been added to **{role.name}**!\n\nCheck your DMs for more information.", ephemeral=True)


# ──────────────────────────────────────────────
# Load Cogs
# ──────────────────────────────────────────────

COGS = [
    "cogs.ping", "cogs.help", "cogs.invite", "cogs.bold", "cogs.randomnumber",
    "cogs.fban", "cogs.fkick", "cogs.suggest", "cogs.ban", "cogs.kick",
    "cogs.timeout", "cogs.role", "cogs.unrole", "cogs.mutevc", "cogs.unmutevc",
    "cogs.setup", "cogs.activitycheck", "cogs.botstats", "cogs.guilds",
    "cogs.dmmembers", "cogs.premium", "cogs.awardcheck", "cogs.award",
    "cogs.ringadd", "cogs.lineup", "cogs.depthchart", "cogs.league",
    "cogs.gametime", "cogs.times", "cogs.contract",
    "cogs.globalannouncement", "cogs.templateuse", "cogs.join",
    "cogs.logging", "cogs.botkick", "cogs.say", "cogs.matchmaking",
]


async def load_cogs():
    for cog in COGS:
        try:
            await bot.load_extension(cog)
            print(f"✅ Loaded: {cog}")
        except Exception as e:
            print(f"❌ Failed to load {cog}: {e}")


# ──────────────────────────────────────────────
# Health Check HTTP Server (for uptime monitoring)
# ──────────────────────────────────────────────

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

async def _http_handler(request: web.Request) -> web.Response:
    if request.method == "OPTIONS":
        return web.Response(headers=CORS_HEADERS)
    path = request.path
    if path in ("/", "/v1", "/api/stats"):
        data = {
            "status": "online",
            "bot": str(bot.user) if bot.user else "starting",
            "guilds": len(bot.guilds),
            "users": sum(g.member_count for g in bot.guilds),
            "uptime": int(__import__("time").time()),
        }
        return web.json_response(data, headers=CORS_HEADERS)
    if path == "/health":
        return web.json_response({"status": "healthy" if bot.user else "starting"}, headers=CORS_HEADERS)
    if path == "/api/guilds":
        guilds = []
        for g in sorted(bot.guilds, key=lambda x: x.member_count or 0, reverse=True):
            guilds.append({
                "id": str(g.id),
                "name": g.name,
                "icon": str(g.icon.url) if g.icon else None,
                "members": g.member_count,
            })
        return web.json_response(guilds, headers=CORS_HEADERS)
    return web.Response(status=404, text="Not found", headers=CORS_HEADERS)


async def start_http():
    base_port = int(os.getenv("PORT", 3000))
    app = web.Application()
    app.router.add_get("/{path_info:.*}", _http_handler)
    runner = web.AppRunner(app)
    await runner.setup()

    # Try the configured port, then fall back to alternatives
    for port in [base_port, 3001, 8080, 8081, 0]:
        try:
            site = web.TCPSite(runner, "0.0.0.0", port)
            await site.start()
            actual_port = port if port != 0 else runner.addresses[0][1]
            print(f"🌐 HTTP server on port {actual_port}")
            return
        except OSError:
            if port == 0:
                print("⚠️  HTTP server could not start (all ports busy) — bot will still run fine")
            continue


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

async def main():
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        print("❌ DISCORD_TOKEN is not set!")
        sys.exit(1)

    await load_cogs()
    await start_http()

    print("🔐 Logging into Discord...")
    async with bot:
        await bot.start(token)


if __name__ == "__main__":
    asyncio.run(main())