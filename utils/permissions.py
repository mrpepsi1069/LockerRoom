"""utils/permissions.py — Role-based permission checks using DB config"""

import discord
import database as db


async def _get_config(guild_id: str) -> dict:
    return await db.get_guild_config(guild_id) or {}


async def _has_role(interaction: discord.Interaction, *role_keys: str) -> bool:
    """Returns True if the user has any of the specified roles or higher."""
    if interaction.user.id == interaction.guild.owner_id:
        return True

    cfg = await _get_config(str(interaction.guild_id))
    member = interaction.user

    for key in role_keys:
        rid = cfg.get(key)
        if rid and member.get_role(int(rid)):
            return True
    return False


# ── Permission levels ────────────────────────────────────────────
# Each level includes itself and all levels above it

async def has_owner_perms(interaction: discord.Interaction) -> bool:
    """Bot owner only (hardcoded user ID)."""
    return interaction.user.id == 1374932337917165702


async def has_admin_perms(interaction: discord.Interaction) -> bool:
    """Admin, Franchise Owner, General Manager, Head Coach, Assistant Coach — or server owner."""
    return await _has_role(interaction,
        "admin_role",
        "franchise_owner_role",
        "general_manager_role",
        "head_coach_role",
        "assistant_coach_role",
    )


async def has_franchise_owner_perms(interaction: discord.Interaction) -> bool:
    """Franchise Owner, Admin — or server owner."""
    return await _has_role(interaction,
        "admin_role",
        "franchise_owner_role",
    )


async def has_manager_perms(interaction: discord.Interaction) -> bool:
    """General Manager and above — or server owner."""
    return await _has_role(interaction,
        "admin_role",
        "franchise_owner_role",
        "general_manager_role",
    )


async def has_coach_perms(interaction: discord.Interaction) -> bool:
    """Head Coach and above — or server owner."""
    return await _has_role(interaction,
        "admin_role",
        "franchise_owner_role",
        "general_manager_role",
        "head_coach_role",
    )


async def has_staff_perms(interaction: discord.Interaction) -> bool:
    """Assistant Coach and above — or server owner."""
    return await _has_role(interaction,
        "admin_role",
        "franchise_owner_role",
        "general_manager_role",
        "head_coach_role",
        "assistant_coach_role",
    )