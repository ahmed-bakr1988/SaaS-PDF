"""Internal admin endpoints secured by authenticated admin sessions."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.account_service import (
    create_user,
    get_user_by_id,
    is_user_admin,
    set_user_role,
    update_user_plan,
)
from app.services.admin_service import (
    get_admin_overview,
    get_admin_ratings_detail,
    get_admin_system_health,
    get_admin_tool_analytics,
    get_admin_user_registration_stats,
    get_plan_interest_summary,
    list_admin_contacts,
    list_admin_users,
    mark_admin_contact_read,
    record_plan_interest_click,
)
from app.services.ai_cost_service import get_monthly_spend
from app.utils.auth import get_current_user_id

admin_bp = Blueprint("admin", __name__)


def _require_admin_session():
    """Return an error response unless the request belongs to an authenticated admin."""
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Authentication required."}), 401
    if not is_user_admin(user_id):
        return jsonify({"error": "Admin access required."}), 403
    return None


@admin_bp.route("/overview", methods=["GET"])
@limiter.limit("60/hour")
def admin_overview_route():
    """Return the internal admin dashboard overview."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    return jsonify(get_admin_overview()), 200


@admin_bp.route("/users", methods=["GET"])
@limiter.limit("60/hour")
def admin_users_route():
    """Return recent users plus usage summaries for the admin dashboard."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    query = request.args.get("query", "")
    try:
        limit = max(1, min(int(request.args.get("limit", 25)), 100))
    except ValueError:
        limit = 25

    return jsonify({"items": list_admin_users(limit=limit, query=query)}), 200


@admin_bp.route("/contacts", methods=["GET"])
@limiter.limit("60/hour")
def admin_contacts_route():
    """Return paginated contact messages for the admin dashboard."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1

    try:
        per_page = max(1, min(int(request.args.get("per_page", 20)), 100))
    except ValueError:
        per_page = 20

    return jsonify(list_admin_contacts(page=page, per_page=per_page)), 200


@admin_bp.route("/contacts/<int:message_id>/read", methods=["POST"])
@limiter.limit("120/hour")
def admin_contacts_mark_read_route(message_id: int):
    """Mark one contact message as read."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    if not mark_admin_contact_read(message_id):
        return jsonify({"error": "Message not found."}), 404

    return jsonify({"message": "Message marked as read."}), 200


@admin_bp.route("/users/<int:user_id>/plan", methods=["POST"])
@limiter.limit("30/hour")
def update_plan_route(user_id: int):
    """Change the plan for one user — admin session required."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    plan = str(data.get("plan", "")).strip().lower()
    if plan not in ("free", "pro"):
        return jsonify({"error": "Plan must be 'free' or 'pro'."}), 400

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    try:
        updated = update_user_plan(user_id, plan)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"message": "Plan updated.", "user": updated}), 200


@admin_bp.route("/users/<int:user_id>/role", methods=["POST"])
@limiter.limit("30/hour")
def update_role_route(user_id: int):
    """Change the role for one user — admin session required."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    actor_user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    role = str(data.get("role", "")).strip().lower()
    if role not in ("user", "admin"):
        return jsonify({"error": "Role must be 'user' or 'admin'."}), 400

    user = get_user_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    if bool(user.get("is_allowlisted_admin")):
        return jsonify(
            {"error": "Allowlisted admin access is managed by INTERNAL_ADMIN_EMAILS."}
        ), 400

    if actor_user_id == user_id and role != "admin":
        return jsonify({"error": "You cannot remove your own admin role."}), 400

    try:
        updated = set_user_role(user_id, role)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"message": "Role updated.", "user": updated}), 200


@admin_bp.route("/ai-cost", methods=["GET"])
@limiter.limit("60/hour")
def ai_cost_dashboard():
    """Return the current month's AI spending summary."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    spend = get_monthly_spend()
    return jsonify(spend), 200


@admin_bp.route("/ratings", methods=["GET"])
@limiter.limit("60/hour")
def admin_ratings_route():
    """Return detailed ratings and reviews for admin inspection."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1

    try:
        per_page = max(1, min(int(request.args.get("per_page", 20)), 100))
    except ValueError:
        per_page = 20

    tool_filter = request.args.get("tool", "").strip()

    return jsonify(
        get_admin_ratings_detail(page=page, per_page=per_page, tool_filter=tool_filter)
    ), 200


@admin_bp.route("/tool-analytics", methods=["GET"])
@limiter.limit("60/hour")
def admin_tool_analytics_route():
    """Return detailed per-tool usage analytics."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    return jsonify(get_admin_tool_analytics()), 200


@admin_bp.route("/user-stats", methods=["GET"])
@limiter.limit("60/hour")
def admin_user_stats_route():
    """Return user registration trends and breakdown."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    return jsonify(get_admin_user_registration_stats()), 200


@admin_bp.route("/plan-interest", methods=["GET"])
@limiter.limit("60/hour")
def admin_plan_interest_route():
    """Return paid plan click interest summary."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    return jsonify(get_plan_interest_summary()), 200


@admin_bp.route("/system-health", methods=["GET"])
@limiter.limit("60/hour")
def admin_system_health_route():
    """Return system health indicators."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    return jsonify(get_admin_system_health()), 200


@admin_bp.route("/plan-interest/record", methods=["POST"])
@limiter.limit("30/hour")
def record_plan_interest_route():
    """Record a click on a paid plan button — public endpoint."""
    data = request.get_json(silent=True) or {}
    plan = str(data.get("plan", "pro")).strip().lower()
    billing = str(data.get("billing", "monthly")).strip().lower()

    if plan not in ("pro",):
        plan = "pro"
    if billing not in ("monthly", "yearly"):
        billing = "monthly"

    user_id = get_current_user_id()
    record_plan_interest_click(user_id=user_id, plan=plan, billing=billing)

    return jsonify({"message": "Interest recorded."}), 200


@admin_bp.route("/database-stats", methods=["GET"])
@limiter.limit("60/hour")
def admin_database_stats_route():
    """Return database statistics (table sizes, row counts)."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    from app.utils.database import (
        db_connection,
        execute_query,
        is_postgres,
        row_to_dict,
    )

    with db_connection() as conn:
        if is_postgres():
            tables_sql = """
                SELECT
                    schemaname,
                    relname AS table_name,
                    n_live_tup AS row_count,
                    pg_total_relation_size(relid) AS total_size,
                    pg_relation_size(relid) AS data_size
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
            """
        else:
            tables_sql = """
                SELECT name AS table_name FROM sqlite_master
                WHERE type='table' ORDER BY name
            """
        cursor = execute_query(conn, tables_sql)
        tables = []
        for row in cursor.fetchall():
            row = row_to_dict(row)
            if is_postgres():
                tables.append(
                    {
                        "table_name": row["table_name"],
                        "row_count": int(row["row_count"]),
                        "total_size_kb": round(int(row["total_size"]) / 1024, 1),
                        "data_size_kb": round(int(row["data_size"]) / 1024, 1),
                    }
                )
            else:
                count_cursor = execute_query(
                    conn, f"SELECT COUNT(*) AS cnt FROM {row['table_name']}"
                )
                count_row = row_to_dict(count_cursor.fetchone())
                tables.append(
                    {
                        "table_name": row["table_name"],
                        "row_count": int(count_row["cnt"]),
                    }
                )

    return jsonify(
        {
            "database_type": "postgresql" if is_postgres() else "sqlite",
            "tables": tables,
            "table_count": len(tables),
        }
    ), 200


@admin_bp.route("/users/create", methods=["POST"])
@limiter.limit("30/hour")
def admin_create_user_route():
    """Create a new user (admin only)."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    plan = str(data.get("plan", "free")).strip().lower()
    role = str(data.get("role", "user")).strip().lower()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    try:
        user = create_user(email, password)
        if plan == "pro":
            update_user_plan(user["id"], "pro")
        if role == "admin":
            set_user_role(user["id"], "admin")
        return jsonify({"message": "User created.", "user": user}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@limiter.limit("30/hour")
def admin_delete_user_route(user_id):
    """Delete a user (admin only)."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    current_user_id = get_current_user_id()
    if user_id == current_user_id:
        return jsonify({"error": "Cannot delete your own account."}), 400

    from app.utils.database import db_connection, execute_query, is_postgres

    with db_connection() as conn:
        sql = (
            "DELETE FROM users WHERE id = %s"
            if is_postgres()
            else "DELETE FROM users WHERE id = ?"
        )
        cursor = execute_query(conn, sql, (user_id,))

    if cursor.rowcount > 0:
        return jsonify({"message": "User deleted."}), 200
    return jsonify({"error": "User not found."}), 404


@admin_bp.route("/users/<int:user_id>/plan", methods=["PUT"])
@limiter.limit("60/hour")
def admin_update_user_plan_route(user_id):
    """Update a user's plan (admin only)."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    plan = str(data.get("plan", "free")).strip().lower()

    try:
        user = update_user_plan(user_id, plan)
        if user:
            return jsonify({"message": "Plan updated.", "user": user}), 200
        return jsonify({"error": "User not found."}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@limiter.limit("60/hour")
def admin_update_user_role_route(user_id):
    """Update a user's role (admin only)."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True) or {}
    role = str(data.get("role", "user")).strip().lower()

    try:
        user = set_user_role(user_id, role)
        if user:
            return jsonify({"message": "Role updated.", "user": user}), 200
        return jsonify({"error": "User not found."}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_bp.route("/project-events", methods=["GET"])
@limiter.limit("60/hour")
def admin_project_events_route():
    """Return a chronological timeline of important project events."""
    auth_error = _require_admin_session()
    if auth_error:
        return auth_error

    from datetime import timedelta
    from app.utils.database import (
        db_connection,
        execute_query,
        is_postgres,
        row_to_dict,
    )

    days = request.args.get("days", 30, type=int)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    events = []

    with db_connection() as conn:
        user_sql = (
            """
            SELECT created_at AS event_time, 'user_registered' AS event_type,
                   email AS detail, id AS entity_id
            FROM users WHERE created_at >= %s
        """
            if is_postgres()
            else """
            SELECT created_at AS event_time, 'user_registered' AS event_type,
                   email AS detail, id AS entity_id
            FROM users WHERE created_at >= ?
        """
        )
        cursor = execute_query(conn, user_sql, (cutoff,))
        for row in cursor.fetchall():
            row = row_to_dict(row)
            events.append(
                {
                    "time": row["event_time"],
                    "type": "user_registered",
                    "detail": row["detail"],
                    "entity_id": row["entity_id"],
                }
            )

        file_sql = (
            """
            SELECT created_at AS event_time,
                   CASE WHEN status = 'completed' THEN 'file_processed' ELSE 'file_failed' END AS event_type,
                   COALESCE(original_filename, tool) AS detail,
                   id AS entity_id
            FROM file_history WHERE created_at >= %s
        """
            if is_postgres()
            else """
            SELECT created_at AS event_time,
                   CASE WHEN status = 'completed' THEN 'file_processed' ELSE 'file_failed' END AS event_type,
                   COALESCE(original_filename, tool) AS detail,
                   id AS entity_id
            FROM file_history WHERE created_at >= ?
        """
        )
        cursor2 = execute_query(conn, file_sql, (cutoff,))
        for row in cursor2.fetchall():
            row = row_to_dict(row)
            events.append(
                {
                    "time": row["event_time"],
                    "type": row["event_type"],
                    "detail": row["detail"],
                    "entity_id": row["entity_id"],
                }
            )

        contact_sql = (
            """
            SELECT created_at AS event_time, 'contact_message' AS event_type,
                   subject AS detail, id AS entity_id
            FROM contact_messages WHERE created_at >= %s
        """
            if is_postgres()
            else """
            SELECT created_at AS event_time, 'contact_message' AS event_type,
                   subject AS detail, id AS entity_id
            FROM contact_messages WHERE created_at >= ?
        """
        )
        cursor3 = execute_query(conn, contact_sql, (cutoff,))
        for row in cursor3.fetchall():
            row = row_to_dict(row)
            events.append(
                {
                    "time": row["event_time"],
                    "type": "contact_message",
                    "detail": row["detail"],
                    "entity_id": row["entity_id"],
                }
            )

    events.sort(key=lambda e: e["time"], reverse=True)

    summary = {}
    for e in events:
        t = e["type"]
        summary[t] = summary.get(t, 0) + 1

    return jsonify(
        {
            "events": events[:200],
            "summary": summary,
            "total_events": len(events),
            "period_days": days,
        }
    ), 200
