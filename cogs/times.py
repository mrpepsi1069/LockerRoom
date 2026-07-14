# cogs/times.py — Multiple time-slot polls

import re
import discord
from discord import app_commands
from discord.ext import commands
from utils.embeds import success_embed, error_embed
from utils.permissions import has_manager_perms


class Times(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="times", description="Create a poll for multiple time options")
    @app_commands.describe(
        league="League name/abbreviation",
        role="Role to ping",
        time1="Time option 1",
        time2="Time option 2",
        time3="Time option 3",
        time4="Time option 4 (optional)",
        time5="Time option 5 (optional)",
        time6="Time option 6 (optional)",
    )
    async def times(
        self,
        interaction: discord.Interaction,
        league: str,
        role: discord.Role,
        time1: str,
        time2: str,
        time3: str,
        time4: str = None,
        time5: str = None,
        time6: str = None,
    ):
        if not await has_manager_perms(interaction):
            return await interaction.response.send_message(
                embed=error_embed("Permission Denied", "You need Manager role or higher."),
                ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)

        time_options = [t for t in [time1, time2, time3, time4, time5, time6] if t]

        desc = f"**League:** {league}\n\nSelect which times work for you:\n\n"
        for t in time_options:
            desc += f"🕐 **{t}**\n• None yet\n\n"

        embed = discord.Embed(
            title="⏰ Available Times Poll",
            description=desc.strip(),
            color=0x5865F2,
        )
        embed.set_footer(text="Click the buttons to select your available times")

        view = TimesView(time_options, league)

        try:
            await interaction.channel.send(
                content=role.mention,
                embed=embed,
                view=view,
                allowed_mentions=discord.AllowedMentions(roles=True),
            )

            await interaction.followup.send(
                embed=success_embed(
                    "Times Poll Created",
                    f"Created poll for **{league}** with {len(time_options)} options!"
                ),
                ephemeral=True,
            )

        except discord.Forbidden:
            await interaction.followup.send(
                embed=error_embed(
                    "Missing Permissions",
                    "I need Send Messages, Embed Links, and Mention Roles permissions."
                ),
                ephemeral=True,
            )

    # ──────────────────────────────────────────────
    # Button handling
    #
    # These buttons are intentionally NOT wired up with a per-instance
    # Python callback (see TimesView below). Poll state lives entirely in
    # the message's embed text, so handling clicks here — driven only by
    # the interaction's custom_id and the live message content — means the
    # buttons keep working even after a bot restart, when the original
    # TimesView object that created them no longer exists in memory.
    # ──────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_interaction(self, interaction: discord.Interaction):
        if interaction.type != discord.InteractionType.component:
            return
        cid = interaction.data.get("custom_id", "")
        if not cid.startswith("times*"):
            return

        try:
            index = int(cid.split("*", 1)[1].split("_", 1)[0])
        except (IndexError, ValueError):
            return

        await interaction.response.defer(ephemeral=True)

        embed = interaction.message.embeds[0]
        uid = str(interaction.user.id)

        header, sections = _parse_sections(embed.description)

        if index >= len(sections):
            return await interaction.followup.send("❌ Something went wrong.", ephemeral=True)

        t, users = sections[index]

        if uid in users:
            users.remove(uid)
        else:
            users.append(uid)

        sections[index] = (t, users)

        new_embed = discord.Embed.from_dict(embed.to_dict())
        new_embed.description = _build_desc(header, sections)

        await interaction.message.edit(embed=new_embed)

        selected = [t for t, users in sections if uid in users]

        if selected:
            msg = "✅ Your selected times:\n" + "\n".join(f"• {t}" for t in selected)
        else:
            msg = "ℹ️ You haven't selected any times yet."

        await interaction.followup.send(msg, ephemeral=True)


def _parse_sections(desc: str) -> tuple[str, list[tuple[str, list[str]]]]:
    """Parse embed description into header + list of (time, [user_ids])."""
    parts = desc.split("🕐 **")

    header = parts[0].strip()
    header = re.sub(r"\n+Select which times work for you:.*", "", header, flags=re.DOTALL).strip()

    sections = []
    for part in parts[1:]:
        if "**" not in part:
            continue
        time_str, rest = part.split("**", 1)
        user_ids = re.findall(r"<@(\d+)>", rest)
        sections.append((time_str, user_ids))

    return header, sections


def _build_desc(header: str, sections: list[tuple[str, list[str]]]) -> str:
    desc = header + "\n\nSelect which times work for you:\n\n"

    for t, users in sections:
        desc += f"🕐 **{t}**\n"
        if users:
            desc += "• " + " • ".join(f"<@{uid}>" for uid in users) + "\n\n"
        else:
            desc += "• None yet\n\n"

    return desc.strip()


class TimesView(discord.ui.View):
    def __init__(self, time_options: list[str], league: str):
        super().__init__(timeout=None)
        self.time_options = time_options
        self.league = league

        for i, t in enumerate(time_options):
            label = t[:80] if len(t) <= 80 else t[:77] + "..."
            safe_time = re.sub(r"\s+", "*", t)[:50]

            btn = discord.ui.Button(
                label=label,
                style=discord.ButtonStyle.primary,
                custom_id=f"times*{i}_{safe_time}",
            )
            self.add_item(btn)


async def setup(bot: commands.Bot):
    await bot.add_cog(Times(bot))