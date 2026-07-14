"""cogs/botkick.py — Admin-only command to kick the bot from a server"""

import discord
from discord import app_commands
from discord.ext import commands

ADMIN_ID = 1314823988253560852


class BotKick(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="botkick", description="[Admin] Kick the bot from a server")
    @app_commands.describe(server_id="The ID of the server to leave")
    async def botkick(self, interaction: discord.Interaction, server_id: str):
        if interaction.user.id != ADMIN_ID:
            return await interaction.response.send_message(
                "❌ You do not have permission to use this command.",
                ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        try:
            guild = self.bot.get_guild(int(server_id))
        except ValueError:
            return await interaction.followup.send("❌ Invalid server ID.", ephemeral=True)

        if guild is None:
            return await interaction.followup.send(
                f"❌ Bot is not in a server with ID `{server_id}`.",
                ephemeral=True
            )

        guild_name = guild.name
        await guild.leave()

        embed = discord.Embed(
            title="✅ Left Server",
            description=f"Successfully left **{guild_name}** (`{server_id}`)",
            color=0x57F287
        )
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(BotKick(bot))
