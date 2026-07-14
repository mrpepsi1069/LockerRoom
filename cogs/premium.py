"""cogs/premium.py"""

import discord
from discord import app_commands
from discord.ext import commands


DISCORD_LINK = "https://discord.gg/3cWdPsCPC8"


class Premium(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="premium", description="View premium plans and pricing")
    async def premium(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="💎 TeamCore Custom Premium",
            description="Unlock exclusive features for your team!",
            color=0xFFD700,
        )
        embed.add_field(
            name="💰 Pricing Plans",
            value=(
                "**Monthly** — $4/month\n"
                "**Lifetime** — $12 (Best Value 🔥)\n"
                "**Custom Commands** — $1-3"
            ),
            inline=False,
        )
        embed.add_field(
            name="✨ Premium Features",
            value=(
                "• Auto-DM game times to team members\n"
                "• Custom commands for your bot\n"
                "• Customizable bot name and avatar\n"
                "• DM all members with announcements\n"
                "• Priority support\n"
                "• Early access to new features\n"
                "• Advanced data backup\n"
                "• Detailed usage statistics\n"
                "• More future features in the works"
            ),
            inline=False,
        )
        embed.add_field(
            name="💳 Payment Methods",
            value="• CashApp\n• PayPal\n• Venmo",
            inline=True,
        )
        embed.add_field(
            name="🛒 How to Purchase",
            value="Click **Purchase Premium** below to join our Discord and open a ticket!",
            inline=False,
        )
        embed.set_footer(text="Made by Ghostie | Premium Support Available 24/7")

        view = discord.ui.View()
        view.add_item(discord.ui.Button(label="Purchase Premium", style=discord.ButtonStyle.link, url=DISCORD_LINK, emoji="💎"))
        view.add_item(discord.ui.Button(label="View Demo", style=discord.ButtonStyle.link, url=DISCORD_LINK, emoji="🎬"))

        await interaction.response.send_message(embed=embed, view=view)


async def setup(bot: commands.Bot):
    await bot.add_cog(Premium(bot))
