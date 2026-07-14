"""cogs/join.py — Admin-only command to get an invite for any server the bot is in"""

import discord
from discord import app_commands
from discord.ext import commands

ADMIN_ID = 1314823988253560852


class Join(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="join", description="[Admin] Get an invite link for a server the bot is in")
    @app_commands.describe(server_id="The ID of the server to get an invite for")
    async def join(self, interaction: discord.Interaction, server_id: str):
        if interaction.user.id != ADMIN_ID:
            return await interaction.response.send_message(
                "❌ You do not have permission to use this command.",
                ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        # Check if bot is in that server
        try:
            guild = self.bot.get_guild(int(server_id))
        except ValueError:
            return await interaction.followup.send("❌ Invalid server ID.", ephemeral=True)

        if guild is None:
            return await interaction.followup.send(
                f"❌ Bot is not in a server with ID `{server_id}`.",
                ephemeral=True
            )

        # Try to create an invite from the first channel possible
        invite = None
        for channel in guild.text_channels:
            if channel.permissions_for(guild.me).create_instant_invite:
                try:
                    invite = await channel.create_invite(
                        max_age=300,  # 5 minutes
                        max_uses=1,
                        unique=True,
                        reason="Admin /join command"
                    )
                    break
                except Exception:
                    continue

        if invite is None:
            return await interaction.followup.send(
                f"❌ Could not create an invite for **{guild.name}**. Bot may lack permissions.",
                ephemeral=True
            )

        embed = discord.Embed(
            title="🔗 Invite Created",
            color=0x5865F2
        )
        embed.add_field(name="Server", value=guild.name, inline=True)
        embed.add_field(name="Members", value=str(guild.member_count), inline=True)
        embed.add_field(name="Server ID", value=str(guild.id), inline=True)
        embed.add_field(name="Invite Link", value=invite.url, inline=False)
        embed.set_footer(text="Expires in 5 minutes • 1 use only")
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Join(bot))
