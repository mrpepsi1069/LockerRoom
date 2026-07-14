"""cogs/setup.py — Full server setup with dropdowns (no modals)"""

import discord
from discord import app_commands
from discord.ext import commands
import database as db

# Role hierarchy levels (higher = more permissions)
ROLE_HIERARCHY = [
    "assistant_coach_role",
    "head_coach_role",
    "general_manager_role",
    "franchise_owner_role",
    "admin_role",
]

ROLE_LABELS = {
    "assistant_coach_role":  "Assistant Coach",
    "head_coach_role":       "Head Coach",
    "general_manager_role":  "General Manager",
    "franchise_owner_role":  "Franchise Owner",
    "admin_role":            "Admin",
}

CHANNEL_KEYS = {
    "log_channel":         "Log Channel",
    "announce_channel":    "Announcements Channel",
    "gametime_channel":    "Gametime Channel",
    "matchmaking_channel": "Matchmaking Channel",
    "contract_channel":    "Contract Channel",
    "awards_channel":      "Awards Channel",
    "league_log_channel":  "League Log Channel",
}


def check(val) -> str:
    return "✅" if val else "❌"


async def build_status_embed(guild_id: str) -> discord.Embed:
    cfg = await db.get_guild_config(guild_id) or {}

    embed = discord.Embed(
        title="⚙️ TeamCore Setup",
        description="Configure your server using the buttons below.",
        color=0x5865F2,
    )

    # Roles
    role_lines = ""
    for key in ROLE_HIERARCHY:
        rid = cfg.get(key)
        role_lines += f"{check(rid)} **{ROLE_LABELS[key]}** — {f'<@&{rid}>' if rid else 'Not set'}\n"
    embed.add_field(name="👥 Role Hierarchy", value=role_lines, inline=False)

    # Channels
    ch_lines = ""
    for key, label in CHANNEL_KEYS.items():
        cid = cfg.get(key)
        ch_lines += f"{check(cid)} **{label}** — {f'<#{cid}>' if cid else 'Not set'}\n"
    embed.add_field(name="📢 Channels", value=ch_lines, inline=False)

    # Progress bar
    total = len(ROLE_HIERARCHY) + len(CHANNEL_KEYS)
    done = sum(1 for k in list(ROLE_HIERARCHY) + list(CHANNEL_KEYS) if cfg.get(k))
    bar_filled = int((done / total) * 10)
    bar = "█" * bar_filled + "░" * (10 - bar_filled)

    embed.add_field(
        name="📊 Progress",
        value=f"`{bar}` {done}/{total} complete",
        inline=False,
    )

    embed.set_footer(text="Only the server owner can use setup")
    return embed


# ─────────────────────────────────────────────
# DROPDOWNS
# ─────────────────────────────────────────────

class RoleSelect(discord.ui.RoleSelect):
    def __init__(self, key: str, label: str):
        super().__init__(
            placeholder=f"Select {label}",
            min_values=1,
            max_values=1
        )
        self.key = key
        self.label = label

    async def callback(self, interaction: discord.Interaction):
        role = self.values[0]
        await db.set_guild_config(str(interaction.guild_id), {self.key: role.id})

        embed = await build_status_embed(str(interaction.guild_id))
        new_view = SetupView()
        await interaction.response.edit_message(embed=embed, view=new_view)
        new_view.message = interaction.message


class ChannelSelect(discord.ui.ChannelSelect):
    def __init__(self, key: str, label: str):
        super().__init__(
            placeholder=f"Select {label}",
            min_values=1,
            max_values=1,
            channel_types=[discord.ChannelType.text, discord.ChannelType.news]
        )
        self.key = key
        self.label = label

    async def callback(self, interaction: discord.Interaction):
        channel = self.values[0]
        await db.set_guild_config(str(interaction.guild_id), {self.key: channel.id})

        embed = await build_status_embed(str(interaction.guild_id))
        new_view = SetupView()
        await interaction.response.edit_message(embed=embed, view=new_view)
        new_view.message = interaction.message


# ─────────────────────────────────────────────
# MAIN VIEW
# ─────────────────────────────────────────────

class SetupView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=300)
        self.message: discord.Message | None = None

    async def send_select(self, interaction, select):
        view = discord.ui.View()
        view.add_item(select)

        await interaction.response.send_message(
            "Make a selection below:",
            view=view,
            ephemeral=True
        )

    # ROLE BUTTONS

    @discord.ui.button(label="Assistant Coach", style=discord.ButtonStyle.secondary, emoji="🏈", row=0)
    async def set_ac(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, RoleSelect("assistant_coach_role", "Assistant Coach"))

    @discord.ui.button(label="Head Coach", style=discord.ButtonStyle.secondary, emoji="🏈", row=0)
    async def set_hc(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, RoleSelect("head_coach_role", "Head Coach"))

    @discord.ui.button(label="General Manager", style=discord.ButtonStyle.secondary, emoji="💼", row=0)
    async def set_gm(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, RoleSelect("general_manager_role", "General Manager"))

    @discord.ui.button(label="Franchise Owner", style=discord.ButtonStyle.secondary, emoji="👑", row=1)
    async def set_fo(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, RoleSelect("franchise_owner_role", "Franchise Owner"))

    @discord.ui.button(label="Admin", style=discord.ButtonStyle.secondary, emoji="🛡️", row=1)
    async def set_admin(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, RoleSelect("admin_role", "Admin"))

    # CHANNEL BUTTONS

    @discord.ui.button(label="Log Channel", style=discord.ButtonStyle.primary, emoji="📋", row=2)
    async def set_log(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("log_channel", "Log Channel"))

    @discord.ui.button(label="Announcements", style=discord.ButtonStyle.primary, emoji="📢", row=2)
    async def set_announce(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("announce_channel", "Announcements Channel"))

    @discord.ui.button(label="Gametime Channel", style=discord.ButtonStyle.primary, emoji="⏰", row=2)
    async def set_gametime(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("gametime_channel", "Gametime Channel"))

    @discord.ui.button(label="Matchmaking Channel", style=discord.ButtonStyle.primary, emoji="🎮", row=2)
    async def set_matchmaking(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("matchmaking_channel", "Matchmaking Channel"))

    @discord.ui.button(label="Contract Channel", style=discord.ButtonStyle.primary, emoji="📜", row=2)
    async def set_contract(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("contract_channel", "Contract Channel"))

    @discord.ui.button(label="Awards Channel", style=discord.ButtonStyle.primary, emoji="🏆", row=3)
    async def set_awards(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("awards_channel", "Awards Channel"))

    @discord.ui.button(label="League Log Channel", style=discord.ButtonStyle.primary, emoji="🏈", row=3)
    async def set_league_log(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.send_select(interaction, ChannelSelect("league_log_channel", "League Log Channel"))

    # RESET

    @discord.ui.button(label="Reset All", style=discord.ButtonStyle.danger, emoji="🗑️", row=4)
    async def reset_all(self, interaction: discord.Interaction, button: discord.ui.Button):
        await db.set_guild_config(
            str(interaction.guild_id),
            {key: None for key in list(ROLE_HIERARCHY) + list(CHANNEL_KEYS)}
        )

        embed = await build_status_embed(str(interaction.guild_id))
        await interaction.response.edit_message(embed=embed, view=self)

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except discord.HTTPException:
                pass


# ─────────────────────────────────────────────
# COG
# ─────────────────────────────────────────────

class Setup(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Configure TeamCore for this server")
    async def setup(self, interaction: discord.Interaction):
        if interaction.user.id != interaction.guild.owner_id:
            return await interaction.response.send_message(
                "❌ Only the server owner can run setup.",
                ephemeral=True
            )

        embed = await build_status_embed(str(interaction.guild_id))
        view = SetupView()
        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True
        )
        view.message = await interaction.original_response()


async def setup(bot: commands.Bot):
    await bot.add_cog(Setup(bot))