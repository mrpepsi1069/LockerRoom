"""utils/embeds.py — Reusable Discord embed builders."""

import discord
from config import COLORS


def _base(title: str, description: str, color: int) -> discord.Embed:
    return discord.Embed(title=title, description=description, color=color)


def success_embed(title: str, description: str = "") -> discord.Embed:
    return _base(f"✅ {title}", description, COLORS["success"])


def error_embed(title: str, description: str = "") -> discord.Embed:
    return _base(f"❌ {title}", description, COLORS["error"])


def warning_embed(title: str, description: str = "") -> discord.Embed:
    return _base(f"⚠️ {title}", description, COLORS["warning"])


def info_embed(title: str, description: str = "") -> discord.Embed:
    return _base(title, description, COLORS["primary"])


def lineup_embed(lineup: dict) -> discord.Embed:
    embed = discord.Embed(
        title=f"📋 {lineup['lineup_name']}",
        description=lineup.get("description") or "",
        color=COLORS["primary"],
    )
    players = lineup.get("players") or []
    value = (
        "\n".join(f"**{p['position']}:** <@{p['user_id']}>" for p in players)
        if players
        else "No players added yet."
    )
    embed.add_field(name="Players", value=value, inline=False)
    return embed


def awards_embed(user_data: dict) -> discord.Embed:
    embed = discord.Embed(
        title=f"🏆 {user_data['username']}'s Awards",
        color=COLORS["primary"],
    )
    rings = user_data.get("rings") or []
    awards = user_data.get("awards") or []

    if not rings and not awards:
        embed.description = "No awards yet."
        return embed

    if rings:
        embed.add_field(
            name="Championship Rings",
            value="\n".join(f"💍 {r.get('league', 'Unknown')} — {r.get('season', '?')}" for r in rings),
            inline=False,
        )
    if awards:
        embed.add_field(
            name="Individual Awards",
            value="\n".join(f"🏆 {a.get('award', '?')} — {a.get('league', '?')} {a.get('season', '?')}" for a in awards),
            inline=False,
        )
    return embed


def help_embed() -> discord.Embed:
    embed = discord.Embed(
        title="TeamCore Commands",
        description="Team chat bot for league teams",
        color=COLORS["primary"],
    )
    embed.add_field(
        name="👥 Public Commands",
        value=(
            "/help - Display this menu\n"
            "/invite - Get bot invite\n"
            "/awardcheck - View self awards\n"
            "/suggest - Submit suggestion\n"
            "/flipcoin - Flip a coin\n"
            "/randomnumber - Pick a random number from min to max\n"
            "/bold - Boldify text\n"
            "/fban - Fake ban\n"
            "/fkick - Fake kick\n"
            "/ping - Check bot latency"
        ),
        inline=False,
    )
    embed.add_field(
        name="🎮 Matchmaking",
        value=(
            "/matchmaking - Open the Core Match Making board\n"
            "/matchmaking-queue - View who's currently looking for a match\n"
            "/matchmaking-cancel - Cancel your pending request(s)"
        ),
        inline=False,
    )
    embed.add_field(
        name="👮 Staff Commands",
        value=(
            "/mutevc - Mute voice channel\n"
            "/unmutevc - Unmute voice channel\n"
            "/dmmembers - DM members with selected roles"
        ),
        inline=False,
    )
    embed.add_field(
        name="👑 Manager Commands",
        value=(
            "/gametime - Create game time poll (DMs players with Premium)\n"
            "/times - Multiple time options\n"
            "/league add - Add a new league\n"
            "/league delete - Delete a league\n"
            "/league recruit - Post recruitment message\n"
            "/ring-add - Grant rings\n"
            "/award - Give awards"
        ),
        inline=False,
    )
    embed.add_field(
        name="Lineups",
        value=(
            "/lineup create - Create a new lineup\n"
            "/lineup view - View a specific lineup\n"
            "/lineup edit - Edit a player position in a lineup\n"
            "/lineup delete - Delete a lineup\n"
            "/lineup add - Add a player to a lineup\n"
            "/lineup remove - Remove a player from a lineup\n"
            "/lineup post - Post a lineup to a channel\n"
            "/lineup list - View all lineups"
        ),
        inline=False,
    )
    embed.add_field(
        name="Depth Charts",
        value=(
            "/depthchart create - Create a new depth chart\n"
            "/depthchart delete - Delete an entire depth chart\n"
            "/depthchart add - Add a player to depth chart\n"
            "/depthchart remove - Remove a player from depth chart\n"
            "/depthchart promote - Promote a player up the depth chart\n"
            "/depthchart demote - Demote a player down the depth chart"
        ),
        inline=False,
    )
    embed.add_field(
        name="Contracts",
        value=(
            "/contract add - Add a player contract\n"
            "/contract remove - Remove a player contract\n"
            "/contract post - Post all active contracts\n"
            "/activitycheck - Set activity check"
        ),
        inline=False,
    )
    embed.add_field(
        name="🔧 Admin Commands",
        value=(
            "/setup - Configure bot\n"
            "/role - Give a user a role\n"
            "/unrole - Remove a role from a user\n"
            "/kick - Kick a user\n"
            "/ban - Ban a user\n"
            "/timeout - Timeout a user"
        ),
        inline=False,
    )
    embed.set_footer(text="TeamCore • By Korvert")
    return embed