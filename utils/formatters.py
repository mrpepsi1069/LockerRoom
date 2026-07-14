# utils/formatters.py - Text formatting utilities (TeamCore)
from datetime import datetime


def format_date(dt: datetime) -> str:
    return f"<t:{int(dt.timestamp())}:F>"


def format_date_short(dt: datetime) -> str:
    return f"<t:{int(dt.timestamp())}:f>"


def format_relative_time(dt: datetime) -> str:
    return f"<t:{int(dt.timestamp())}:R>"


def format_uptime(seconds: float) -> str:
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{days}d {hours}h {minutes}m"


def truncate_text(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def capitalize_first(s: str) -> str:
    return s[0].upper() + s[1:] if s else s


def format_user_list(user_ids: list, separator: str = ", ") -> str:
    return separator.join(f"<@{uid}>" for uid in user_ids)


def format_number(num: int) -> str:
    return f"{num:,}"
