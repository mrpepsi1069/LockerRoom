"""cogs/mutevc.py"""

import discord
from discord import app_commands
from discord.ext import commands
from utils.embeds import error_embed, success_embed
from utils.permissions import has_staff_perms


class MuteVC(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="mutevc", description="Mute everyone in your current voice channel (Staff only)")
    async def mutevc(self, interaction: discord.Interaction):
        if not await has_staff_perms(interaction):
            return await interaction.response.send_message(
                embed=error_embed("Permission Denied", "You need Staff role or higher."), ephemeral=True
            )

        member = interaction.guild.get_member(interaction.user.id)
        vc = member.voice.channel if member.voice else None
        if not vc:
            return await interaction.response.send_message(
                embed=error_embed("Not in Voice", "You must be in a voice channel."), ephemeral=True
            )

        muted = skipped = 0
        for m in vc.members:
            if m.id in (self.bot.user.id, interaction.user.id) or m.voice.server_mute:
                if not m.voice.server_mute and m.id != self.bot.user.id:
                    skipped += 1
                continue
            try:
                await m.edit(mute=True)
                muted += 1
            except Exception:
                pass

        text = f"Muted **{muted}** member(s) in {vc.name}"
        if skipped:
            text += f"\n*Skipped {skipped} staff/manager(s)*"
        await interaction.response.send_message(embed=success_embed("Voice Channel Muted", text))


async def setup(bot: commands.Bot):
    await bot.add_cog(MuteVC(bot))
