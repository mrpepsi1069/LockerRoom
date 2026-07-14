"""cogs/botstats.py"""

import time
import discord
from discord import app_commands
from discord.ext import commands
from utils.embeds import error_embed
from utils.permissions import has_owner_perms
import database as db


def _fmt_uptime(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 86400}d {(s % 86400) // 3600}h {(s % 3600) // 60}m"


class BotStats(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._start = time.time()

    @app_commands.command(name="botstats", description="View global bot statistics (Owner only)")
    async def botstats(self, interaction: discord.Interaction):
        if not await has_owner_perms(interaction):
            return await interaction.response.send_message(
                embed=error_embed("Permission Denied", "This command is owner-only."), ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)
        stats = await db.get_bot_stats()

        embed = discord.Embed(title="📊 Bot Statistics", color=0x5865F2)
        embed.add_field(name="Total Guilds", value=str(stats["total_guilds"]), inline=True)
        embed.add_field(name="Premium Guilds", value=str(stats["premium_guilds"]), inline=True)
        embed.add_field(name="Total Users", value=str(stats["total_users"]), inline=True)
        embed.add_field(name="Commands Used", value=str(stats["total_commands_used"]), inline=True)
        embed.add_field(name="Uptime", value=_fmt_uptime(time.time() - self._start), inline=True)
        mem = __import__("resource").getrusage(__import__("resource").RUSAGE_SELF).ru_maxrss
        embed.add_field(name="Memory", value=f"{mem / 1024:.1f} MB", inline=True)
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(BotStats(bot))
