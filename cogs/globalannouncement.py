"""cogs/globalannouncement.py — TeamCore Global Message system"""

import discord
from discord import app_commands
from discord.ext import commands
import database as db

# Only this user can send global announcements
GLOBAL_ADMIN_ID = 1374932337917165702

CHANNEL_NAME = "teamcore-global"


class GlobalAnnouncement(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ──────────────────────────────────────────────
    # /globalannouncement
    # ──────────────────────────────────────────────

    @app_commands.command(
        name="globalannouncement",
        description="[TeamCore Admin] Send a global message to all servers"
    )
    @app_commands.describe(message="The announcement message to send to all servers")
    async def globalannouncement(self, interaction: discord.Interaction, message: str):
        # Only the designated global admin can use this
        if interaction.user.id != GLOBAL_ADMIN_ID:
            return await interaction.response.send_message(
                "❌ You do not have permission to use this command.",
                ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        success = 0
        failed = 0

        for guild in self.bot.guilds:
            try:
                # Find or create the TeamCore Global channel
                channel = discord.utils.get(guild.text_channels, name=CHANNEL_NAME)

                # Build overwrites: private channel, admin roles only
                correct_overwrites = {
                    guild.default_role: discord.PermissionOverwrite(view_channel=False),
                    guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, embed_links=True),
                }
                # Grant access to every role that has administrator permission
                for role in guild.roles:
                    if role.permissions.administrator:
                        correct_overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=False)
                # Always grant the owner direct access too
                if guild.owner:
                    correct_overwrites[guild.owner] = discord.PermissionOverwrite(view_channel=True, send_messages=False)

                if channel is None:
                    # Try to create the channel, fall back to system/any channel
                    try:
                        channel = await guild.create_text_channel(
                            name=CHANNEL_NAME,
                            overwrites=correct_overwrites,
                            topic="📢 Official announcements from TeamCore Bot",
                            reason="TeamCore Global Message system"
                        )
                    except discord.Forbidden:
                        # No permission to create channel — fall back to system channel or first available
                        channel = guild.system_channel
                        if channel is None:
                            channel = next(
                                (c for c in guild.text_channels if c.permissions_for(guild.me).send_messages),
                                None
                            )
                        if channel is None:
                            failed += 1
                            continue
                else:
                    # Channel already exists — fix permissions silently
                    try:
                        await channel.edit(
                            overwrites=correct_overwrites,
                            reason="TeamCore Global Message — fixing permissions"
                        )
                    except discord.Forbidden:
                        pass  # Can't edit perms, still try to send

                # Check if pings are disabled for this guild
                pings_disabled = await db.get_global_pings_disabled(str(guild.id))

                # Build the embed
                embed = discord.Embed(
                    title="📢 TeamCore Global Announcement",
                    description=message,
                    color=0x5865F2
                )
                embed.set_footer(text="TeamCore Bot • Global Message System")

                # Ping the owner unless disabled
                ping_text = ""
                if not pings_disabled and guild.owner:
                    ping_text = f"{guild.owner.mention} "

                await channel.send(
                    content=f"{ping_text}*Do `/disableglobalmessages` to stop owner pings*",
                    embed=embed
                )
                success += 1

            except Exception as e:
                print(f"❌ Global announcement failed for {guild.name}: {e}")
                failed += 1

        await interaction.followup.send(
            f"✅ Announcement sent!\n📊 Success: **{success}** servers\n❌ Failed: **{failed}** servers",
            ephemeral=True
        )

    # ──────────────────────────────────────────────
    # /disableglobalmessages
    # ──────────────────────────────────────────────

    @app_commands.command(
        name="disableglobalmessages",
        description="Disable owner pings for TeamCore global announcements in this server"
    )
    async def disableglobalmessages(self, interaction: discord.Interaction):
        # Only the server owner can use this
        if interaction.user.id != interaction.guild.owner_id:
            return await interaction.response.send_message(
                "❌ Only the server owner can use this command.",
                ephemeral=True
            )

        currently_disabled = await db.get_global_pings_disabled(str(interaction.guild_id))

        if currently_disabled:
            # Toggle back on
            await db.set_global_pings_disabled(str(interaction.guild_id), False)
            await interaction.response.send_message(
                "✅ Owner pings for TeamCore global announcements have been **re-enabled**.",
                ephemeral=True
            )
        else:
            # Disable
            await db.set_global_pings_disabled(str(interaction.guild_id), True)
            await interaction.response.send_message(
                "✅ Owner pings for TeamCore global announcements have been **disabled**.\n"
                "You will still receive announcements in the channel, just without a ping.\n"
                "Run `/disableglobalmessages` again to re-enable pings.",
                ephemeral=True
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(GlobalAnnouncement(bot))