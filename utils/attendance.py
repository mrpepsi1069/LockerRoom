# utils/attendance.py - Game time attendance logic (TeamCore)


def group_attendance_by_response(attendance_list: list) -> dict:
    grouped = {"attending": [], "maybe": [], "not_attending": []}
    for record in attendance_list:
        resp = record.get("response")
        if resp == "attending":
            grouped["attending"].append(record)
        elif resp == "maybe":
            grouped["maybe"].append(record)
        elif resp == "not_attending":
            grouped["not_attending"].append(record)
    return grouped


def format_attendance(grouped: dict) -> dict:
    attending = (
        ", ".join(f"<@{r['user_id']}>" for r in grouped["attending"])
        if grouped["attending"] else "None yet"
    )
    maybe = (
        ", ".join(f"<@{r['user_id']}>" for r in grouped["maybe"])
        if grouped["maybe"] else "None yet"
    )
    not_attending = (
        ", ".join(f"<@{r['user_id']}>" for r in grouped["not_attending"])
        if grouped["not_attending"] else "None yet"
    )
    return {
        "attending": attending,
        "maybe": maybe,
        "not_attending": not_attending,
        "total_responses": sum(len(v) for v in grouped.values()),
    }
