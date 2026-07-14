"""database.py — Async MongoDB wrapper using Motor."""

import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId


_client: AsyncIOMotorClient | None = None
_db = None


async def initialize() -> None:
    global _client, _db
    try:
        _client = AsyncIOMotorClient(
            os.getenv("DATABASE_URL"),
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000,
        )
        _db = _client["lockerroom_bot"]
        await _create_indexes()
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("⚠️  Continuing without database")


async def _create_indexes() -> None:
    if _db is None:
        return
    await _db.guilds.create_index("guild_id", unique=True)
    await _db.leagues.create_index([("guild_id", 1), ("league_abbr", 1)], unique=True)
    await _db.lineups.create_index([("guild_id", 1), ("lineup_name", 1)], unique=True)
    await _db.users.create_index("user_id", unique=True)
    await _db.championship_rings.create_index(
        [("guild_id", 1), ("league_id", 1), ("user_id", 1), ("season", 1)], unique=True
    )
    await _db.awards.create_index(
        [("guild_id", 1), ("league_id", 1), ("user_id", 1), ("award_name", 1), ("season", 1)],
        unique=True,
    )
    await _db.gametime_rsvps.create_index("messageId", unique=True)
    await _db.depth_charts.create_index([("guildId", 1), ("abbreviation", 1)], unique=True)
    await _db.contracts.create_index([("guildId", 1), ("userId", 1)], unique=True)
    await _db.matchmaking_queue.create_index([("guild_id", 1), ("game", 1), ("size", 1)])
    await _db.matchmaking_queue.create_index([("guild_id", 1), ("user_id", 1)])
    await _db.matchmaking_queue.create_index("created_at")


def _check() -> bool:
    return _db is not None


# ──────────────────────────────────────────────
# GUILD
# ──────────────────────────────────────────────

async def create_guild(guild_id: str, guild_name: str):
    if not _check():
        return None
    await _db.guilds.update_one(
        {"guild_id": guild_id},
        {
            "$set": {"guild_name": guild_name},
            "$setOnInsert": {"premium": False, "setup_completed": False},
        },
        upsert=True,
    )
    return await _db.guilds.find_one({"guild_id": guild_id})


async def get_guild(guild_id: str):
    if not _check():
        return None
    return await _db.guilds.find_one({"guild_id": guild_id})


async def update_guild_setup(guild_id: str, completed: bool) -> None:
    if not _check():
        return
    await _db.guilds.update_one(
        {"guild_id": guild_id}, {"$set": {"setup_completed": completed}}
    )


async def set_premium(guild_id: str, is_premium: bool, expires_at=None) -> None:
    if not _check():
        return
    await _db.guilds.update_one(
        {"guild_id": guild_id},
        {"$set": {"premium": is_premium, "premium_expires_at": expires_at}},
    )


# ──────────────────────────────────────────────
# CHANNELS & ROLES
# ──────────────────────────────────────────────

async def set_guild_channel(guild_id: str, channel_type: str, channel_id: str) -> None:
    if not _check():
        return
    await _db.guild_channels.update_one(
        {"guild_id": guild_id, "channel_type": channel_type},
        {"$set": {"channel_id": channel_id}},
        upsert=True,
    )


async def get_guild_channels(guild_id: str) -> dict:
    if not _check():
        return {}
    docs = await _db.guild_channels.find({"guild_id": guild_id}).to_list(None)
    return {d["channel_type"]: d["channel_id"] for d in docs}


async def set_guild_role(guild_id: str, role_type: str, role_id: str) -> None:
    if not _check():
        return
    await _db.guild_roles.update_one(
        {"guild_id": guild_id, "role_type": role_type},
        {"$set": {"role_id": role_id}},
        upsert=True,
    )


async def get_guild_roles(guild_id: str) -> dict:
    if not _check():
        return {}
    docs = await _db.guild_roles.find({"guild_id": guild_id}).to_list(None)
    return {d["role_type"]: d["role_id"] for d in docs}


# ──────────────────────────────────────────────
# GUILD CONFIG (setup)
# ──────────────────────────────────────────────

async def get_guild_config(guild_id: str) -> dict | None:
    if not _check():
        return None
    return await _db.guild_config.find_one({"guild_id": guild_id})


async def set_guild_config(guild_id: str, updates: dict) -> None:
    if not _check():
        return
    set_fields = {k: v for k, v in updates.items() if v is not None}
    unset_fields = {k: "" for k, v in updates.items() if v is None}

    op = {}
    if set_fields:
        op["$set"] = {**set_fields, "guild_id": guild_id}
    if unset_fields:
        op["$unset"] = unset_fields

    if op:
        await _db.guild_config.update_one(
            {"guild_id": guild_id},
            op,
            upsert=True
        )


# ──────────────────────────────────────────────
# LEAGUES
# ──────────────────────────────────────────────

async def create_league(guild_id, name, abbr, signup_link=None, role_id=None):
    if not _check():
        return None
    doc = {
        "guild_id": guild_id,
        "league_name": name,
        "league_abbr": abbr.upper(),
        "signup_link": signup_link,
        "role_id": role_id,
        "is_active": True,
    }
    result = await _db.leagues.insert_one(doc)
    return {**doc, "_id": result.inserted_id}


async def get_leagues(guild_id: str):
    if not _check():
        return []
    return await _db.leagues.find({"guild_id": guild_id, "is_active": True}).to_list(None)


async def get_league_by_abbr(guild_id: str, abbr: str):
    if not _check():
        return None
    return await _db.leagues.find_one({"guild_id": guild_id, "league_abbr": abbr.upper()})


async def get_league_by_role_id(guild_id: str, role_id: str):
    if not _check():
        return None
    return await _db.leagues.find_one({"guild_id": guild_id, "role_id": role_id})


async def delete_league(guild_id: str, abbr: str) -> bool:
    if not _check():
        return False
    r = await _db.leagues.delete_one({"guild_id": guild_id, "league_abbr": abbr.upper()})
    return r.deleted_count > 0


# ──────────────────────────────────────────────
# USERS
# ──────────────────────────────────────────────

async def create_or_update_user(user_id: str, username: str):
    if not _check():
        return None
    await _db.users.update_one(
        {"user_id": user_id},
        {"$set": {"username": username}, "$setOnInsert": {"custom_color": None}},
        upsert=True,
    )
    return await _db.users.find_one({"user_id": user_id})


# ──────────────────────────────────────────────
# AWARDS & RINGS
# ──────────────────────────────────────────────

async def add_championship_ring(guild_id, league_id, user_id, season, opponent, awarded_by):
    if not _check():
        return None
    try:
        doc = {
            "guild_id": guild_id,
            "league_id": str(league_id),
            "user_id": user_id,
            "season": season,
            "opponent": opponent,
            "awarded_by": awarded_by,
        }
        r = await _db.championship_rings.insert_one(doc)
        return {**doc, "_id": r.inserted_id}
    except Exception as e:
        if getattr(e, "code", None) == 11000:
            return None
        raise


async def add_award(guild_id, league_id, user_id, award_name, season, awarded_by):
    if not _check():
        return None
    try:
        doc = {
            "guild_id": str(guild_id),
            "league_id": str(league_id),
            "user_id": str(user_id),
            "award_name": str(award_name),
            "season": str(season),
            "awarded_by": str(awarded_by),
        }
        r = await _db.awards.insert_one(doc)
        return {**doc, "_id": r.inserted_id}
    except Exception as e:
        if getattr(e, "code", None) == 11000:
            return None
        raise


async def get_user_awards(guild_id: str, user_id: str):
    if not _check():
        return None
    user = await _db.users.find_one({"user_id": user_id})
    if not user:
        return None

    pipeline_rings = [
        {"$match": {"guild_id": guild_id, "user_id": user_id}},
        {"$lookup": {"from": "leagues", "localField": "league_id", "foreignField": "_id", "as": "league_info"}},
        {"$project": {"league": {"$arrayElemAt": ["$league_info.league_name", 0]}, "season": 1, "opponent": 1}},
    ]
    pipeline_awards = [
        {"$match": {"guild_id": guild_id, "user_id": user_id}},
        {"$lookup": {"from": "leagues", "localField": "league_id", "foreignField": "_id", "as": "league_info"}},
        {"$project": {"league": {"$arrayElemAt": ["$league_info.league_name", 0]}, "award": "$award_name", "season": 1}},
    ]

    rings = await _db.championship_rings.aggregate(pipeline_rings).to_list(None)
    awards = await _db.awards.aggregate(pipeline_awards).to_list(None)
    return {"username": user["username"], "rings": rings, "awards": awards}


# ──────────────────────────────────────────────
# LINEUPS
# ──────────────────────────────────────────────

async def create_lineup(guild_id, name, description, created_by):
    if not _check():
        return None
    try:
        doc = {"guild_id": guild_id, "lineup_name": name, "description": description, "created_by": created_by, "players": []}
        r = await _db.lineups.insert_one(doc)
        return {**doc, "_id": r.inserted_id}
    except Exception as e:
        if getattr(e, "code", None) == 11000:
            raise ValueError("DUPLICATE_LINEUP")
        raise


async def get_lineups(guild_id: str):
    if not _check():
        return []
    return await _db.lineups.find({"guild_id": guild_id}).to_list(None)


async def get_lineup(guild_id: str, name: str):
    if not _check():
        return None
    lineup = await _db.lineups.find_one({"guild_id": guild_id, "lineup_name": name})
    if not lineup:
        return None
    if lineup.get("players"):
        ids = [p["user_id"] for p in lineup["players"]]
        users = await _db.users.find({"user_id": {"$in": ids}}).to_list(None)
        user_map = {u["user_id"]: u["username"] for u in users}
        for p in lineup["players"]:
            p["username"] = user_map.get(p["user_id"], "Unknown")
    return lineup


async def add_player_to_lineup(lineup_id, user_id: str, position: str):
    if not _check():
        return None
    lineup = await _db.lineups.find_one({"_id": ObjectId(str(lineup_id))})
    if not lineup:
        raise ValueError("Lineup not found")
    players = [p for p in lineup["players"] if p["user_id"] != user_id]
    players.append({"user_id": user_id, "position": position})
    await _db.lineups.update_one({"_id": ObjectId(str(lineup_id))}, {"$set": {"players": players}})
    return {"user_id": user_id, "position": position}


async def remove_player_from_lineup(lineup_id, user_id: str) -> None:
    if not _check():
        return
    lineup = await _db.lineups.find_one({"_id": ObjectId(str(lineup_id))})
    if not lineup:
        raise ValueError("Lineup not found")
    players = [p for p in lineup["players"] if p["user_id"] != user_id]
    await _db.lineups.update_one({"_id": ObjectId(str(lineup_id))}, {"$set": {"players": players}})


async def delete_lineup(guild_id: str, name: str) -> None:
    if not _check():
        return
    await _db.lineups.delete_one({"guild_id": guild_id, "lineup_name": name})


# ──────────────────────────────────────────────
# GAMETIMES
# ──────────────────────────────────────────────

async def create_gametime(guild_id, league, game_time, message_id, channel_id, ping_role_id, created_by):
    if not _check():
        return None
    doc = {
        "guild_id": guild_id, "guildId": guild_id,
        "league": league, "game_time": game_time,
        "message_id": message_id, "messageId": message_id,
        "channel_id": channel_id, "channelId": channel_id,
        "ping_role_id": ping_role_id, "created_by": created_by,
        "is_active": True, "responses": [],
    }
    r = await _db.gametimes.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


async def get_gametime_by_message_id(message_id: str):
    if not _check():
        return None
    return await _db.gametimes.find_one(
        {"$or": [{"message_id": message_id}, {"messageId": message_id}]}
    )


# ──────────────────────────────────────────────
# ACTIVITY CHECKS
# ──────────────────────────────────────────────

async def create_activity_check(guild_id, message_id, channel_id, expires_at, created_by):
    if not _check():
        return None
    doc = {
        "guild_id": guild_id, "message_id": message_id,
        "channel_id": channel_id, "expires_at": expires_at,
        "created_by": created_by, "is_active": True, "responses": [],
    }
    r = await _db.activity_checks.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


# ──────────────────────────────────────────────
# SUGGESTIONS
# ──────────────────────────────────────────────

async def create_suggestion(guild_id, user_id, text):
    if not _check():
        return None
    doc = {"guild_id": guild_id, "user_id": user_id, "suggestion_text": text, "status": "pending"}
    r = await _db.suggestions.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


# ──────────────────────────────────────────────
# STATS & LOGGING
# ──────────────────────────────────────────────

async def log_command(command_name: str, guild_id: str, user_id: str) -> None:
    if not _check():
        return
    await _db.command_usage.insert_one(
        {"command_name": command_name, "guild_id": guild_id, "user_id": user_id}
    )


async def get_bot_stats() -> dict:
    if not _check():
        return {"total_guilds": 0, "total_users": 0, "total_commands_used": 0, "premium_guilds": 0}
    return {
        "total_guilds": await _db.guilds.count_documents({}),
        "total_users": await _db.users.count_documents({}),
        "total_commands_used": await _db.command_usage.count_documents({}),
        "premium_guilds": await _db.guilds.count_documents({"premium": True}),
    }


# ──────────────────────────────────────────────
# DEPTH CHARTS
# ──────────────────────────────────────────────

async def create_depth_chart(guild_id, name, abbreviation):
    if not _check():
        return None
    doc = {"guildId": guild_id, "name": name, "abbreviation": abbreviation.upper(), "players": []}
    r = await _db.depth_charts.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


async def get_depth_chart(guild_id: str, abbreviation: str):
    if not _check():
        return None
    return await _db.depth_charts.find_one({"guildId": guild_id, "abbreviation": abbreviation.upper()})


async def get_all_depth_charts(guild_id: str):
    if not _check():
        return []
    return await _db.depth_charts.find({"guildId": guild_id}).to_list(None)


async def delete_depth_chart(guild_id: str, abbreviation: str) -> bool:
    if not _check():
        return False
    r = await _db.depth_charts.delete_one({"guildId": guild_id, "abbreviation": abbreviation.upper()})
    return r.deleted_count > 0


async def add_player_to_depth_chart(guild_id: str, abbreviation: str, user_id: str) -> bool:
    if not _check():
        return False
    await _db.depth_charts.update_one(
        {"guildId": guild_id, "abbreviation": abbreviation.upper()},
        {"$push": {"players": {"userId": user_id}}},
    )
    return True


async def remove_player_from_depth_chart(guild_id: str, abbreviation: str, user_id: str) -> bool:
    if not _check():
        return False
    await _db.depth_charts.update_one(
        {"guildId": guild_id, "abbreviation": abbreviation.upper()},
        {"$pull": {"players": {"userId": user_id}}},
    )
    return True


async def swap_depth_chart_players(guild_id: str, abbreviation: str, i1: int, i2: int) -> bool:
    if not _check():
        return False
    dc = await get_depth_chart(guild_id, abbreviation)
    if not dc:
        raise ValueError("Depth chart not found")
    players = list(dc["players"])
    players[i1], players[i2] = players[i2], players[i1]
    await _db.depth_charts.update_one(
        {"guildId": guild_id, "abbreviation": abbreviation.upper()},
        {"$set": {"players": players}},
    )
    return True


# ──────────────────────────────────────────────
# CONTRACTS
# ──────────────────────────────────────────────

async def add_contract(guild_id, user_id, position, amount, due, terms, paid, message_id, created_by):
    if not _check():
        return None
    doc = {
        "guildId": guild_id, "userId": user_id,
        "position": position, "amount": amount,
        "due": due, "terms": terms, "paid": paid,
        "messageId": message_id, "createdBy": created_by,
    }
    r = await _db.contracts.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


async def get_player_contract(guild_id: str, user_id: str):
    if not _check():
        return None
    return await _db.contracts.find_one({"guildId": guild_id, "userId": user_id})


async def get_all_contracts(guild_id: str):
    if not _check():
        return []
    return await _db.contracts.find({"guildId": guild_id}).to_list(None)


async def remove_contract(guild_id: str, user_id: str) -> bool:
    if not _check():
        return False
    r = await _db.contracts.delete_one({"guildId": guild_id, "userId": user_id})
    return r.deleted_count > 0


async def mark_contract_paid(guild_id: str, user_id: str, paid: bool = True) -> bool:
    if not _check():
        return False
    await _db.contracts.update_one(
        {"guildId": guild_id, "userId": user_id},
        {"$set": {"paid": paid}},
    )
    return True


async def get_contract_by_message_id(message_id: str):
    if not _check():
        return None
    return await _db.contracts.find_one({"messageId": message_id})


# ──────────────────────────────────────────────
# GLOBAL ANNOUNCEMENT SETTINGS
# ──────────────────────────────────────────────

async def get_global_pings_disabled(guild_id: str) -> bool:
    if not _check():
        return False
    doc = await _db.global_settings.find_one({"guild_id": guild_id})
    return bool(doc and doc.get("pings_disabled", False))


async def set_global_pings_disabled(guild_id: str, disabled: bool) -> None:
    if not _check():
        return
    await _db.global_settings.update_one(
        {"guild_id": guild_id},
        {"$set": {"pings_disabled": disabled}},
        upsert=True
    )


# ──────────────────────────────────────────────
# MATCHMAKING
# ──────────────────────────────────────────────

async def create_matchmaking_request(
    guild_id: str, user_id: str, game: str, size: str, time_text: str,
    channel_id: str = None, message_id: str = None,
):
    if not _check():
        return None
    doc = {
        "guild_id": guild_id,
        "user_id": user_id,
        "game": game,
        "size": size,
        "time_text": time_text,
        "channel_id": channel_id,
        "message_id": message_id,
        "created_at": datetime.now(timezone.utc),
    }
    r = await _db.matchmaking_queue.insert_one(doc)
    return {**doc, "_id": r.inserted_id}


async def get_user_matchmaking_request(guild_id: str, user_id: str, game: str, size: str):
    """Check if this user already has a pending request for this exact game+size."""
    if not _check():
        return None
    return await _db.matchmaking_queue.find_one(
        {"guild_id": guild_id, "user_id": user_id, "game": game, "size": size}
    )


async def find_matchmaking_opponent(guild_id: str, game: str, size: str, exclude_user_id: str):
    """Find the oldest waiting request for this game+size from someone else."""
    if not _check():
        return None
    return await _db.matchmaking_queue.find_one(
        {"guild_id": guild_id, "game": game, "size": size, "user_id": {"$ne": exclude_user_id}},
        sort=[("created_at", 1)],
    )


async def update_matchmaking_request(
    request_id, time_text: str = None, channel_id: str = None, message_id: str = None,
) -> None:
    if not _check():
        return
    updates = {}
    if time_text is not None:
        updates["time_text"] = time_text
    if channel_id is not None:
        updates["channel_id"] = channel_id
    if message_id is not None:
        updates["message_id"] = message_id
    if updates:
        await _db.matchmaking_queue.update_one({"_id": ObjectId(str(request_id))}, {"$set": updates})


async def remove_matchmaking_request(request_id) -> None:
    if not _check():
        return
    await _db.matchmaking_queue.delete_one({"_id": ObjectId(str(request_id))})


async def get_matchmaking_queue(guild_id: str):
    if not _check():
        return []
    return await _db.matchmaking_queue.find({"guild_id": guild_id}).sort("created_at", 1).to_list(None)


async def get_user_matchmaking_requests(guild_id: str, user_id: str):
    if not _check():
        return []
    return await _db.matchmaking_queue.find({"guild_id": guild_id, "user_id": user_id}).to_list(None)


async def get_expired_matchmaking_requests(cutoff: datetime):
    if not _check():
        return []
    return await _db.matchmaking_queue.find({"created_at": {"$lt": cutoff}}).to_list(None)