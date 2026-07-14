"""cogs/league.py"""

import random
import discord
from discord import app_commands
from discord.ext import commands
from utils.embeds import success_embed, error_embed
from utils.permissions import has_coach_perms
import database as db


class League(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    group = app_commands.Group(name="league", description="Manage leagues")

    async def _league_autocomplete(self, interaction: discord.Interaction, current: str):
        leagues = await db.get_leagues(str(interaction.guild_id))
        return [
            app_commands.Choice(name=f"{l['league_abbr']} - {l['league_name']}", value=l["league_abbr"])
            for l in leagues
            if current.lower() in l["league_abbr"].lower() or current.lower() in l["league_name"].lower()
        ][:25]

    @group.command(name="add", description="Add a new league")
    @app_commands.describe(name="League name", abbreviation="Short abbreviation (e.g., NFA)", signup="Signup link (optional)")
    async def add(self, interaction: discord.Interaction, name: str, abbreviation: str, signup: str = None):
        if not await has_coach_perms(interaction):
            return await interaction.response.send_message(embed=error_embed("Permission Denied", "You need Coach role or higher."), ephemeral=True)

        abbr = abbreviation.upper()[:10]
        await interaction.response.defer(ephemeral=True)

        existing = await db.get_league_by_abbr(str(interaction.guild_id), abbr)
        if existing:
            return await interaction.followup.send(embed=error_embed("Already Exists", f"League **{abbr}** already exists!"), ephemeral=True)

        try:
            role = await interaction.guild.create_role(
                name=abbr,
                color=discord.Color(random.randint(0, 0xFFFFFF)),
                reason=f"League role for {name}",
                mentionable=True,
            )
        except discord.Forbidden:
            return await interaction.followup.send(embed=error_embed("Permission Error", "I need Manage Roles permission to create a role!"), ephemeral=True)

        await db.create_league(str(interaction.guild_id), name, abbr, signup, str(role.id))

        channels = await db.get_guild_config(str(interaction.guild_id)) or {}
        if channels.get("league_log_channel"):
            log_ch = interaction.guild.get_channel(int(channels["league_log_channel"]))
            if log_ch:
                log = discord.Embed(title="🏈 New League Added", description=f"**{name}** ({abbr})", color=0x00FF00)
                log.add_field(name="Role", value=role.mention, inline=True)
                log.add_field(name="Added By", value=interaction.user.mention, inline=True)
                if signup:
                    log.add_field(name="Signup Link", value=signup, inline=False)
                await log_ch.send(embed=log)

        await interaction.followup.send(
            embed=success_embed("League Added", f"**{name}** ({abbr})\n**Role:** {role.mention}" + (f"\n**Signup:** {signup}" if signup else "") + f"\n\nUse `/league recruit {abbr}` to post a recruitment message!"),
            ephemeral=True,
        )

    @group.command(name="delete", description="Delete a league")
    @app_commands.describe(abbreviation="League abbreviation to delete")
    @app_commands.autocomplete(abbreviation=_league_autocomplete)
    async def delete(self, interaction: discord.Interaction, abbreviation: str):
        if not await has_coach_perms(interaction):
            return await interaction.response.send_message(embed=error_embed("Permission Denied", "You need Coach role or higher."), ephemeral=True)

        abbr = abbreviation.upper()
        await interaction.response.defer(ephemeral=True)
        league = await db.get_league_by_abbr(str(interaction.guild_id), abbr)
        if not league:
            return await interaction.followup.send(embed=error_embed("Not Found", f"League **{abbr}** doesn't exist!"), ephemeral=True)

        if league.get("role_id"):
            role = interaction.guild.get_role(int(league["role_id"]))
            if role:
                try:
                    await role.delete(reason=f"League {abbr} deleted")
                except Exception:
                    pass

        await db.delete_league(str(interaction.guild_id), abbr)

        channels = await db.get_guild_config(str(interaction.guild_id)) or {}
        if channels.get("league_log_channel"):
            log_ch = interaction.guild.get_channel(int(channels["league_log_channel"]))
            if log_ch:
                log = discord.Embed(title="🗑️ League Deleted", description=f"**{league['league_name']}** ({abbr})", color=0xFF0000)
                log.add_field(name="Deleted By", value=interaction.user.mention, inline=True)
                await log_ch.send(embed=log)

        await interaction.followup.send(embed=success_embed("League Deleted", f"**{league['league_name']}** ({abbr}) and its role have been removed."), ephemeral=True)

    @group.command(name="list", description="List all leagues")
    async def list_(self, interaction: discord.Interaction):
        await interaction.response.defer()
        leagues = await db.get_leagues(str(interaction.guild_id))
        if not leagues:
            return await interaction.followup.send(embed=error_embed("No Leagues", "No leagues found. Use `/league add`."))

        lines = []
        for l in leagues:
            role_str = f"<@&{l['role_id']}>" if l.get("role_id") else "No role"
            line = f"**{l['league_abbr']}** — {l['league_name']}\n└ Role: {role_str}"
            if l.get("signup_link"):
                line += f" • [Signup]({l['signup_link']})"
            lines.append(line)

        embed = discord.Embed(title="🏈 Active Leagues", description="\n\n".join(lines), color=0x5865F2)
        embed.set_footer(text=f"{interaction.guild.name} • {len(leagues)} league(s)")
        await interaction.followup.send(embed=embed)

    @group.command(name="recruit", description="Post a recruitment message for a league")
    @app_commands.describe(abbreviation="League abbreviation")
    @app_commands.autocomplete(abbreviation=_league_autocomplete)
    async def recruit(self, interaction: discord.Interaction, abbreviation: str):
        if not await has_coach_perms(interaction):
            return await interaction.response.send_message(embed=error_embed("Permission Denied", "You need Coach role or higher."), ephemeral=True)

        abbr = abbreviation.upper()
        await interaction.response.defer(ephemeral=True)
        league = await db.get_league_by_abbr(str(interaction.guild_id), abbr)
        if not league:
            return await interaction.followup.send(embed=error_embed("Not Found", f"League **{abbr}** doesn't exist!"), ephemeral=True)

        embed = discord.Embed(
            title="🏆 League Recruitment",
            description=f"Interested in joining **{league['league_name']}**?\nClick below to sign up!",
            color=0xFFD700,
        )
        embed.set_author(name=interaction.guild.name, icon_url=interaction.guild.icon.url if interaction.guild.icon else None)
        embed.add_field(name="📋 League Info", value=f"**{league['league_name']}** | {abbr}", inline=False)
        embed.set_footer(text=f"{interaction.guild.name} | Recruitment")

        view = discord.ui.View(timeout=None)
        if league.get("role_id"):
            view.add_item(discord.ui.Button(
                label="Sign Me",
                style=discord.ButtonStyle.primary,
                custom_id=f"league_signup_{league['role_id']}",
                emoji="✍️",
            ))
        if league.get("signup_link"):
            view.add_item(discord.ui.Button(
                label="Link to League",
                style=discord.ButtonStyle.link,
                url=league["signup_link"],
                emoji="🔗",
            ))

        await interaction.channel.send(embed=embed, view=view)
        await interaction.followup.send(embed=success_embed("Recruitment Posted", f"Posted recruitment for **{league['league_name']}**!"), ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(League(bot))
