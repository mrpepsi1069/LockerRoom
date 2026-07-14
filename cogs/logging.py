"""cogs/logging.py — Private logging for guild joins, leaves, and errors"""

import traceback
import discord
from discord.ext import commands

LOG_GUILD_ID = 1447457533135425539

CHANNEL_GUILD_JOINS  = "guild-joins"
CHANNEL_GUILD_LEAVES = "guild-leaves"
CHANNEL_BOT_ERRORS   = "bot-errors"


async def _get_log_channel(bot: commands.Bot, name: str) -> discord.TextChannel | None:
    guild = bot.get_guild(LOG_GUILD_ID)
    if guild is None:
        return None
    channel = discord.utils.get(guild.text_channels, name=name)
    if channel is None:
        try:
            channel = await guild.create_text_channel(
                name=name,
                reason="TeamCore logging system"
            )
        except Exception:
            return None
    return channel


async def _get_invite(guild: discord.Guild) -> str:
    """Try to fetch or create an invite link for a guild."""
    try:
        invites = await guild.invites()
        if invites:
            return str(invites[0].url)
    except Exception:
        pass
    try:
        # Try to create one from the first channel we can
        for channel in guild.text_channels:
            if channel.permissions_for(guild.me).create_instant_invite:
                invite = await channel.create_invite(max_age=0, max_uses=0, unique=False)
                return str(invite.url)
    except Exception:
        pass
    return "No invite available"


class Logging(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ──────────────────────────────────────────────
    # Create channels on startup
    # ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_ready(self):
        for name in [CHANNEL_GUILD_JOINS, CHANNEL_GUILD_LEAVES, CHANNEL_BOT_ERRORS]:
            await _get_log_channel(self.bot, name)

    # ──────────────────────────────────────────────
    # Guild Join
    # ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_guild_join(self, guild: discord.Guild):
        channel = await _get_log_channel(self.bot, CHANNEL_GUILD_JOINS)
        if channel is None:
            return

        invite = await _get_invite(guild)

        embed = discord.Embed(
            title="✅ TeamCore Joined a Server",
            color=0x57F287
        )
        embed.add_field(name="Server", value=guild.name, inline=True)
        embed.add_field(name="Members", value=str(guild.member_count), inline=True)
        embed.add_field(name="Server ID", value=str(guild.id), inline=True)
        embed.add_field(name="Invite", value=invite, inline=False)
        embed.set_footer(text=f"Total servers: {len(self.bot.guilds)}")
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)

        await channel.send(embed=embed)

    # ──────────────────────────────────────────────
    # Guild Leave
    # ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_guild_remove(self, guild: discord.Guild):
        channel = await _get_log_channel(self.bot, CHANNEL_GUILD_LEAVES)
        if channel is None:
            return

        embed = discord.Embed(
            title="❌ TeamCore Left a Server",
            color=0xED4245
        )
        embed.add_field(name="Server", value=guild.name, inline=True)
        embed.add_field(name="Members", value=str(guild.member_count), inline=True)
        embed.add_field(name="Server ID", value=str(guild.id), inline=True)
        embed.set_footer(text=f"Total servers: {len(self.bot.guilds)}")
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)

        await channel.send(embed=embed)

    # ──────────────────────────────────────────────
    # Error Logging
    # ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_app_command_error(self, interaction: discord.Interaction, error: Exception):
        """Private admin logging only. bot.py's @bot.tree.error handler owns the
        user-facing reply and re-dispatches here via bot.dispatch(), since
        discord.py's app_commands errors don't reach cog listeners on their own."""
        channel = await _get_log_channel(self.bot, CHANNEL_BOT_ERRORS)

        guild_name = interaction.guild.name if interaction.guild else "DM"
        guild_id   = str(interaction.guild_id) if interaction.guild_id else "N/A"
        command    = interaction.command.name if interaction.command else "unknown"
        tb         = "".join(traceback.format_exception(type(error), error, error.__traceback__))

        if channel:
            invite = await _get_invite(interaction.guild) if interaction.guild else "N/A"

            embed = discord.Embed(
                title="⚠️ Bot Error",
                color=0xFEE75C
            )
            embed.add_field(name="Command", value=f"/{command}", inline=True)
            embed.add_field(name="Server", value=guild_name, inline=True)
            embed.add_field(name="Server ID", value=guild_id, inline=True)
            embed.add_field(name="Invite", value=invite, inline=False)
            embed.add_field(
                name="Error",
                value=f"```{str(error)[:1000]}```",
                inline=False
            )
            if tb and tb.strip() != "NoneType: None":
                embed.add_field(
                    name="Traceback",
                    value=f"```{tb[-800:]}```",
                    inline=False
                )
            embed.set_footer(text=f"User: {interaction.user}")
            await channel.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Logging(bot))