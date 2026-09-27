from pathlib import Path
from urllib.parse import urlparse, unquote
from uuid import uuid4
from math import isfinite
from datetime import datetime, timedelta
from functools import lru_cache, wraps
import base64
import hashlib
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import time
import psycopg
from psycopg.rows import dict_row
import requests
import cloudinary
import cloudinary.uploader
from io import BytesIO
from PIL import Image

from flask import (
    Flask,
    g,
    jsonify,
    request,
    session,
    send_from_directory,
)
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename


app = Flask(__name__)
# Keep existing artisan sessions valid when the local development server restarts.
_secret_path = Path(__file__).with_name(".flask_secret")
if not os.environ.get("SECRET_KEY") and not _secret_path.exists():
    try:
        with _secret_path.open("x") as _secret_file:
            _secret_file.write(secrets.token_hex(32))
    except FileExistsError:
        pass
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or _secret_path.read_text().strip()
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_PARTITIONED"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)

CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "https://karigarsetu-frontend.onrender.com",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Customer-Id", "X-Requested-With", "Accept"],
            "expose_headers": ["Content-Type", "X-Customer-Id"],
        }
    },
)

DATABASE_PATH = Path(__file__).with_name("karigarsetu.db")
# The public Render backend calls Gemini directly.  Do not use a localhost n8n
# webhook here: Render cannot reach a workflow running on a developer's PC.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
# Keep this default aligned with the currently available model. Render's
# GEMINI_MODEL environment variable can still override it.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").strip()
UPLOAD_FOLDER = Path(__file__).with_name("uploads")

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "mov"}
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MIN_IMAGE_SIZE_BYTES = 1024

UPLOAD_FOLDER.mkdir(exist_ok=True)

# Cloudinary automatically reads the CLOUDINARY_URL environment variable.
cloudinary.config(secure=True)


def trim_transparent_image(image_bytes):
    """Tightly frame the visible craft while leaving a small transparent margin."""
    with Image.open(BytesIO(image_bytes)) as source:
        image = source.convert("RGBA")

    # Ignore near-invisible edge noise from the segmentation model.
    visible = image.getchannel("A").point(lambda alpha: 255 if alpha >= 24 else 0)
    bounds = visible.getbbox()
    if bounds is None:
        raise ValueError("Background removal did not find a visible product")

    left, top, right, bottom = bounds
    margin = max(8, round(max(right - left, bottom - top) * 0.04))
    image = image.crop((
        max(0, left - margin), max(0, top - margin),
        min(image.width, right + margin), min(image.height, bottom + margin),
    ))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()



def is_allowed_image(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_IMAGE_EXTENSIONS
    )
class PostgresCursor:
    def __init__(self, cursor, lastrowid=None):
        self.cursor = cursor
        self.lastrowid = lastrowid

    def __getattr__(self, name):
        return getattr(self.cursor, name)


class PostgresConnection:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, query, params=None):
        query = query.strip()

        if query.upper().startswith("PRAGMA FOREIGN_KEYS"):
            return self.connection.execute("SELECT 1")

        table_info = re.match(r"PRAGMA\s+table_info\((\w+)\)", query, re.IGNORECASE)
        if table_info:
            return self.connection.execute(
                """
                SELECT column_name AS name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                (table_info.group(1),),
            )

        query = query.replace(
            "INTEGER PRIMARY KEY AUTOINCREMENT",
            "INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY",
        )
        query = query.replace(
            "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
            "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text",
        )
        query = query.replace("?", "%s")

        is_insert = query.upper().startswith("INSERT ")
        needs_id = is_insert and " RETURNING " not in query.upper()

        if needs_id:
            query = f"{query.rstrip(';')} RETURNING id"

        cursor = self.connection.execute(query, params or ())

        if needs_id:
            row = cursor.fetchone()
            return PostgresCursor(cursor, row["id"])

        return PostgresCursor(cursor)

    def commit(self):
        self.connection.commit()

    def close(self):
        self.connection.close()


def get_database():
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        return PostgresConnection(
            psycopg.connect(database_url, row_factory=dict_row)
        )

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_request_artisan_id():
    if session.get("user_role") == "artisan" and session.get("user_id"):
        return session.get("user_id")

    raw_id = request.headers.get("X-Artisan-Id") or request.args.get("artisan_id")
    if raw_id:
        try:
            artisan_id = int(raw_id)
            connection = get_database()
            valid_artisan = connection.execute(
                "SELECT id FROM artisans WHERE id = ? AND verification_status = 'approved'",
                (artisan_id,),
            ).fetchone()
            connection.close()
            if valid_artisan:
                return artisan_id
        except (ValueError, TypeError):
            pass

    return None


def parse_ai_suggested_price(value):
    if isinstance(value, bool) or value is None:
        return None

    if isinstance(value, str):
        value = re.sub(r"[^0-9.-]", "", value.replace(",", ""))

    try:
        price = float(value)
    except (TypeError, ValueError):
        return None

    if not isfinite(price) or price <= 0:
        return None

    return round(price, 2)


def parse_ai_score(value):
    if isinstance(value, bool) or value is None:
        return None

    try:
        # Gemini commonly returns probabilities such as 0.95.  The admin UI
        # uses percentages, so normalise a 0-1 probability to 0-100 here.
        score = float(str(value).strip().rstrip("%"))
    except (TypeError, ValueError):
        return None

    if not isfinite(score):
        return None

    if 0 <= score <= 1:
        score *= 100

    return round(max(0, min(100, score)), 2)


def decide_product_approval(approval_check, duplicate_detected):
    if not isinstance(approval_check, dict):
        return {
            "status": "admin_review",
            "confidence_score": None,
            "risk_score": None,
            "checks": {
                "validationError": "AI approval check was missing or invalid",
                "backendFinalStatus": "admin_review",
            },
            "reason": "AI approval result is missing or invalid; admin review required.",
        }

    confidence_score = parse_ai_score(
        approval_check.get("confidenceScore")
    )
    handmade_probability = parse_ai_score(
        approval_check.get("handmadeProductProbability")
    )

    if confidence_score is None or handmade_probability is None:
        checks = dict(approval_check)
        checks["validationError"] = "Required AI scores were missing or invalid"
        checks["backendFinalStatus"] = "admin_review"

        return {
            "status": "admin_review",
            "confidence_score": confidence_score,
            "risk_score": (
                round(100 - confidence_score, 2)
                if confidence_score is not None
                else None
            ),
            "checks": checks,
            "reason": "Required AI scores are missing or invalid; admin review required.",
        }

    risk_score = round(100 - confidence_score, 2)
    image_present = approval_check.get("imagePresent") is True
    name_image_match = approval_check.get("nameImageMatch") is True
    description_match = approval_check.get("descriptionMatch") is True
    inappropriate_content = (
        approval_check.get("inappropriateContent") is True
    )
    suspicious_content = (
        approval_check.get("suspiciousContent") is True
    )
    image_quality = str(
        approval_check.get("imageQuality", "")
    ).strip().lower()
    raw_issues = approval_check.get("issues", [])
    issues = (
        [str(issue).strip() for issue in raw_issues[:10] if str(issue).strip()]
        if isinstance(raw_issues, list)
        else []
    )

    if duplicate_detected:
        status = "admin_review"
        reason = "Exact duplicate image detected; admin review required."
    elif not image_present:
        status = "admin_review"
        reason = "AI could not verify the product image; admin decision required."
    elif inappropriate_content:
        status = "admin_review"
        reason = "AI flagged possible inappropriate content; admin decision required."
    elif confidence_score < 60 and handmade_probability < 30:
        status = "admin_review"
        reason = "AI found low handmade-product confidence; admin decision required."
    elif (
        # Publish only when the image itself gives strong evidence that the
        # product is handmade and all catalog details match that image.
        confidence_score >= 85
        and risk_score <= 15
        and handmade_probability >= 80
        and name_image_match
        and description_match
        and image_quality in {"clear", "good", "high", "acceptable"}
        and not suspicious_content
        and not issues
    ):
        status = "approved"
        reason = "AI checks passed with high confidence and no risk flags."
    else:
        status = "admin_review"
        reason = "AI confidence or validation checks require an admin decision."

    checks = dict(approval_check)
    checks.update(
        {
            "confidenceScore": confidence_score,
            "riskScore": risk_score,
            "handmadeProductProbability": handmade_probability,
            "issues": issues,
            "duplicateImageDetected": duplicate_detected,
            "backendFinalStatus": status,
        }
    )

    return {
        "status": status,
        "confidence_score": confidence_score,
        "risk_score": risk_score,
        "checks": checks,
        "reason": reason,
    }


def initialize_database():
    connection = get_database()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS artisans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            language TEXT NOT NULL,
            craft_type TEXT NOT NULL,
            location TEXT NOT NULL,
            experience INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            artisan_id INTEGER,
            product_name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            material_cost REAL NOT NULL DEFAULT 0,
            labour_cost REAL NOT NULL DEFAULT 0,
            suggested_price REAL NOT NULL DEFAULT 0,
            selling_price REAL,
            stock_quantity INTEGER NOT NULL DEFAULT 1,
            image_url TEXT,
            detail_focus_json TEXT,
            status TEXT NOT NULL DEFAULT 'pending_ai_check',
            ai_confidence_score REAL,
            ai_risk_score REAL,
            ai_checks_json TEXT,
            ai_decision_reason TEXT,
            image_sha256 TEXT,
            image_phash TEXT,
            length REAL,
            width REAL,
            height REAL,
            dimension_unit TEXT DEFAULT 'cm',
            reported_count INTEGER NOT NULL DEFAULT 0,
            reviewed_by INTEGER,
            reviewed_at TEXT,
            updated_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (artisan_id) REFERENCES artisans (id)
        )
        """
    )

    artisan_columns = {row["name"] for row in connection.execute("PRAGMA table_info(artisans)").fetchall()}
    artisan_migrations = {
        "email": "TEXT",
        "address": "TEXT",
        "password_hash": "TEXT",
        "verification_status": "TEXT NOT NULL DEFAULT 'pending'",
        "proof_image_1": "TEXT",
        "proof_image_2": "TEXT",
        "proof_video": "TEXT",
        "review_note": "TEXT",
        "reviewed_by": "INTEGER",
        "reviewed_at": "TEXT",
    }
    for column, definition in artisan_migrations.items():
        if column not in artisan_columns:
            connection.execute(f"ALTER TABLE artisans ADD COLUMN {column} {definition}")

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_uid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            mobile TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            address TEXT,
            city TEXT,
            district TEXT,
            state TEXT,
            pin_code TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed',
            delivery_address TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            artisan_id INTEGER,
            artisan_name TEXT,
            product_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            image_url TEXT,
            FOREIGN KEY (order_id) REFERENCES customer_orders (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
        """
    )

    # A conversation always belongs to one customer and one artisan.  Product
    # is optional so an artisan can still answer after a listing is removed.
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS marketplace_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            artisan_id INTEGER NOT NULL,
            product_id INTEGER,
            sender_role TEXT NOT NULL,
            body TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            deleted_for_customer INTEGER NOT NULL DEFAULT 0,
            deleted_for_artisan INTEGER NOT NULL DEFAULT 0,
            deleted_for_everyone INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (artisan_id) REFERENCES artisans (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
        """
    )

    message_columns = {row["name"] for row in connection.execute("PRAGMA table_info(marketplace_messages)").fetchall()}
    message_migrations = {
        "deleted_for_customer": "INTEGER NOT NULL DEFAULT 0",
        "deleted_for_artisan": "INTEGER NOT NULL DEFAULT 0",
        "deleted_for_everyone": "INTEGER NOT NULL DEFAULT 0",
        "deleted_at": "TEXT",
    }
    for column, definition in message_migrations.items():
        if column not in message_columns:
            connection.execute(f"ALTER TABLE marketplace_messages ADD COLUMN {column} {definition}")


    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS custom_product_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            artisan_id INTEGER NOT NULL,
            product_id INTEGER,
            customization_details TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            preferred_color TEXT,
            preferred_size TEXT,
            reference_image_url TEXT,
            additional_note TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            quoted_price REAL,
            artisan_message TEXT,
            quoted_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (artisan_id) REFERENCES artisans (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            is_active INTEGER NOT NULL DEFAULT 1,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TEXT,
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            ip_address TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admin_users (id)
        )
        """
    )

    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    admin_name = os.environ.get("ADMIN_NAME", "KarigarSetu Admin").strip()
    if admin_email and admin_password:
        existing_admin = connection.execute(
            "SELECT id FROM admin_users WHERE email = ?",
            (admin_email,),
        ).fetchone()

        if existing_admin is None:
            connection.execute(
                """
                INSERT INTO admin_users (username, email, name, password_hash)
                VALUES (?, ?, ?, ?)
                """,
                (
                    admin_email.split("@")[0],
                    admin_email,
                    admin_name,
                    generate_password_hash(admin_password),
                ),
            )
        else:
            connection.execute(
                """
                UPDATE admin_users
                SET username = ?, name = ?, password_hash = ?, is_active = 1
                WHERE id = ?
                """,
                (
                    admin_email.split("@")[0],
                    admin_name,
                    generate_password_hash(admin_password),
                    existing_admin["id"],
                ),
            )

    migrate_product_schema(connection)

    # Repair catalog scores created before probability values (for example
    # 0.95) were converted to percentages.  Existing 0.95 / 99.05 records
    # become 95 / 5 without changing their approval status.
    connection.execute(
    """
    UPDATE products
    SET ai_confidence_score = ai_confidence_score * 100,
        ai_risk_score = 100 - (ai_confidence_score * 100)
    WHERE ai_confidence_score > 0 AND ai_confidence_score <= 1
    """
)
    connection.commit()
    connection.close()


def detect_image_format(file_bytes):
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "jpeg"

    if (
        len(file_bytes) >= 12
        and file_bytes[:4] == b"RIFF"
        and file_bytes[8:12] == b"WEBP"
    ):
        return "webp"

    return None


def get_uploaded_image_path(image_url):
    if not image_url:
        return None

    filename = Path(urlparse(image_url).path).name

    if not filename or secure_filename(filename) != filename:
        return None

    image_path = UPLOAD_FOLDER / filename
    return image_path if image_path.is_file() else None


def extract_cloudinary_public_id(image_url):
    """Safely extract the Cloudinary public_id for a KarigarSetu product image.

    Returns the public_id string (e.g. 'karigarsetu/product-images/xyz123') if valid,
    or None if the URL is not a verified KarigarSetu product image hosted on Cloudinary.
    """
    if not image_url or not isinstance(image_url, str):
        return None

    try:
        parsed_url = urlparse(image_url.strip())
    except Exception:
        return None

    hostname = (parsed_url.hostname or "").lower()
    if parsed_url.scheme != "https" or not (
        hostname == "res.cloudinary.com" or hostname.endswith(".cloudinary.com")
    ):
        return None

    path = unquote(parsed_url.path or "")
    upload_marker = "/image/upload/"
    upload_idx = path.find(upload_marker)
    if upload_idx == -1:
        return None

    after_upload = path[upload_idx + len(upload_marker):]

    # KarigarSetu product images are strictly stored under 'karigarsetu/product-images/'.
    target_folder = "karigarsetu/product-images/"
    folder_idx = after_upload.find(target_folder)
    if folder_idx == -1:
        return None

    relative_asset_path = after_upload[folder_idx:]
    relative_asset_path = relative_asset_path.split("?")[0].split("#")[0]

    # Strip the file extension (.png, .jpg, .jpeg, .webp, etc.)
    if "." in relative_asset_path:
        public_id, _ = relative_asset_path.rsplit(".", 1)
    else:
        public_id = relative_asset_path

    if (
        public_id.startswith(target_folder)
        and len(public_id.strip()) > len(target_folder)
    ):
        return public_id.strip()

    return None


def remove_uploaded_image(image_url):
    """Safely delete an uploaded product image from local storage or Cloudinary.

    Safety rules:
    - If it's a local file in UPLOAD_FOLDER, it is unlinked using existing logic.
    - If it's a Cloudinary image belonging to 'karigarsetu/product-images', its
      public_id is verified and deleted using cloudinary.uploader.destroy.
    - If public_id cannot be safely determined, no Cloudinary asset is touched.
    - Any error is caught and logged defensively; application flows never crash.
    """
    if not image_url or not isinstance(image_url, str):
        return

    # 1. Local image check (preserves existing behavior)
    image_path = get_uploaded_image_path(image_url)
    if image_path is not None:
        try:
            image_path.unlink()
            app.logger.info("Deleted local product image: %s", image_path)
        except OSError as err:
            app.logger.warning("Failed to delete local product image %s: %s", image_path, err)
        return

    # 2. Cloudinary product image check
    public_id = extract_cloudinary_public_id(image_url)
    if public_id is not None:
        if not os.environ.get("CLOUDINARY_URL"):
            app.logger.warning(
                "Skipping Cloudinary cleanup for public_id '%s': CLOUDINARY_URL is not configured",
                public_id,
            )
            return

        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type="image",
                invalidate=True,
            )
            status = result.get("result") if isinstance(result, dict) else str(result)
            if status == "ok":
                app.logger.info("Successfully deleted Cloudinary product image: %s", public_id)
            else:
                app.logger.warning(
                    "Cloudinary destroy returned unexpected status '%s' for public_id '%s'",
                    status,
                    public_id,
                )
        except Exception as err:
            app.logger.warning(
                "Cloudinary cleanup failed for public_id '%s': %s",
                public_id,
                err,
            )
        return

    # 3. Not a local upload and not a recognizable KarigarSetu Cloudinary asset
    app.logger.info(
        "Image URL '%s' is neither a local file nor a recognized KarigarSetu Cloudinary product asset; skipping cleanup.",
        image_url,
    )


def get_uploaded_image_bytes(image_url):
    """Return bytes for a legacy local upload or a Cloudinary product image."""
    image_path = get_uploaded_image_path(image_url)
    if image_path is not None:
        mime_type = mimetypes.guess_type(image_path.name)[0] or "image/png"
        return image_path.read_bytes(), mime_type

    parsed_url = urlparse(str(image_url or ""))
    cloudinary_host = parsed_url.hostname or ""
    if parsed_url.scheme != "https" or not cloudinary_host.endswith("cloudinary.com"):
        return None

    try:
        # Keep the whole request well inside Render Free's Gunicorn timeout.
        response = requests.get(image_url, timeout=(5, 10))
        response.raise_for_status()
        file_bytes = response.content
    except requests.RequestException:
        return None

    if not file_bytes or len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
        return None

    image_format = detect_image_format(file_bytes)
    if image_format is None:
        return None

    mime_type = {
        "png": "image/png",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
    }[image_format]
    return file_bytes, mime_type


def calculate_bytes_sha256(file_bytes):
    return hashlib.sha256(file_bytes).hexdigest()


def prepare_image_for_gemini(image_bytes):
    """Keep the Gemini inline image small enough for a fast Render request."""
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source = source.convert("RGB")
            # A smaller image is enough for catalog verification and avoids
            # long requests on Render's free instance.
            source.thumbnail((768, 768), Image.Resampling.LANCZOS)
            output = BytesIO()
            source.save(output, format="JPEG", quality=82, optimize=True)
            return output.getvalue(), "image/jpeg"
    except (OSError, ValueError):
        # The upload was already validated. Use its original bytes only if PIL
        # cannot re-encode it.
        return image_bytes, None


def build_catalog_fallback(product_data):
    """Keep the public demo usable without inventing product facts."""
    material_cost = max(0, float(product_data["materialCost"]))
    labour_cost = max(0, float(product_data["labourCost"]))
    base_cost = max(1, material_cost + labour_cost)
    suggested_price = max(int(base_cost), int(round(base_cost * 1.35 / 10.0) * 10))
    category = str(product_data.get("category", "Product")).strip() or "Product"
    raw_title = str(product_data.get("productName", "Product")).strip() or "Product"
    title = " ".join(word[:1].upper() + word[1:] for word in raw_title.split())
    description = re.sub(r"\s+", " ", str(product_data.get("description", "")).strip())
    if description:
        catalog_description = (
            f"{title} is presented with attention to practical use and clear product detail. "
            f"{description.rstrip('.')}. "
            "The suggested price reflects the provided material and labour costs."
        )
        short_description = f"{title} — {description.rstrip('.')}."
    else:
        catalog_description = (
            f"{title} is presented with a clear, practical design. "
            "The suggested price reflects the provided material and labour costs."
        )
        short_description = f"{title} — a practical product with a fair suggested price."

    return {
        "success": True,
        "catalog": {
            "professionalTitle": title,
            "catalogDescription": catalog_description,
            "shortDescription": short_description,
            "suggestedPrice": suggested_price,
            "approvalCheck": {
                "confidenceScore": 0,
                "handmadeProductProbability": 0,
                "needsAdminReview": True,
                "issues": ["Gemini was temporarily unavailable; send this product for admin review."],
            },
            "catalogSource": "fallback",
        },
    }


def generate_catalog_with_gemini(product_data, image_data):
    """Generate the catalog directly from Gemini for the public Render app."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured on the backend")

    image_bytes, mime_type = image_data
    optimized_bytes, optimized_mime_type = prepare_image_for_gemini(image_bytes)
    image_bytes = optimized_bytes
    if optimized_mime_type:
        mime_type = optimized_mime_type
    material_cost = float(product_data["materialCost"])
    labour_cost = float(product_data["labourCost"])
    base_cost = max(1, material_cost + labour_cost)
    prompt = f"""
You are an expert Indian handmade-craft catalog writer. Analyse the supplied
product image together with the artisan information below. Return ONLY valid
JSON, with no markdown and no explanation.

Product name supplied by artisan: {product_data['productName']}
Craft category: {product_data['category']}
Artisan description: {product_data['description']}
Material cost (INR): {material_cost}
Labour cost (INR): {labour_cost}
Artisan location: {product_data.get('artisanLocation', '')}

Return this exact JSON shape:
{{
  "professionalTitle": "short professional English title",
  "catalogDescription": "English catalog description of at least 60 characters",
  "shortDescription": "one concise English sentence",
  "suggestedPrice": 0,
  "approvalCheck": {{
    "confidenceScore": 0,
    "handmadeProductProbability": 0,
    "imagePresent": true,
    "nameImageMatch": true,
    "descriptionMatch": true,
    "inappropriateContent": false,
    "suspiciousContent": false,
    "imageQuality": "clear",
    "issues": []
  }}
}}

Use a sensible whole-number INR suggestedPrice based on image quality,
craftsmanship and costs. It must be at least {int(base_cost)} and no more than
{int(max(base_cost * 5, base_cost + 500))}.

For approvalCheck, inspect the image honestly. confidenceScore and
handmadeProductProbability MUST be whole-number percentages from 0 to 100
(never decimal probabilities such as 0.95). Mark a product as handmade only
when the visible object has credible handmade-craft evidence. If the image is
unclear, mismatched with the supplied name/description, mass-produced, or has
other uncertainty, lower the scores and add a short issue. Do not invent
materials, dimensions, artisan process, or a handmade claim not supported by
the image and artisan description.

Marketplace eligibility: stuffed toys, generic plush teddy bears, electronics,
computer accessories, branded consumer products, plastic factory goods and
other clearly mass-produced products must NOT receive approval-level scores.
Traditional terracotta/wood/metal/handloom crafts and religious idols may
receive high scores only when the visible image and supplied description both
support that conclusion.
""".strip()

    request_body = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                },
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.35,
            "maxOutputTokens": 800,
        },
    }
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent"
    )
    response = None
    last_error = None
    # Retry both temporary HTTP errors and network read timeouts. Previously a
    # single timeout immediately forced every product into the fallback path.
    for attempt in range(3):
        try:
            response = requests.post(
                endpoint,
                headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
                json=request_body,
                timeout=(5, 30),
            )
            if response.ok or response.status_code not in (429, 503):
                break
        except requests.RequestException as error:
            last_error = error
            response = None

        if attempt < 2:
            time.sleep(attempt + 1)

    if response is None:
        app.logger.warning("Gemini unavailable after retries; using catalog fallback: %s", last_error)
        return build_catalog_fallback(product_data)
    if not response.ok:
        # Gemini can temporarily return 429/503 while its free/shared capacity
        # is busy.  Keep the catalog flow usable instead of returning a 502 to
        # the artisan; the successful response shape remains identical.
        app.logger.warning(
            "Gemini returned HTTP %s; using catalog fallback: %s",
            response.status_code,
            response.text[:300],
        )
        return build_catalog_fallback(product_data)

    try:
        response_data = response.json()
        raw_text = response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        catalog = json.loads(raw_text)
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise ValueError("Gemini returned an invalid catalog response") from error

    if not isinstance(catalog, dict) or not isinstance(catalog.get("professionalTitle"), str):
        raise ValueError("Gemini catalog response was incomplete")
    if not isinstance(catalog.get("catalogDescription"), str) or len(catalog["catalogDescription"].strip()) < 40:
        raise ValueError("Gemini did not return a complete English catalog description")

    catalog["suggestedPrice"] = max(
        int(base_cost),
        int(round(float(catalog.get("suggestedPrice", base_cost)))),
    )
    catalog["approvalCheck"] = catalog.get("approvalCheck") if isinstance(catalog.get("approvalCheck"), dict) else {}
    # The backend, not Gemini, makes the final approved/admin_review decision.
    catalog["approvalCheck"].pop("needsAdminReview", None)
    return {"success": True, "catalog": catalog}


def calculate_file_sha256(image_path):
    digest = hashlib.sha256()

    with image_path.open("rb") as image_file:
        for chunk in iter(lambda: image_file.read(65536), b""):
            digest.update(chunk)

    return digest.hexdigest()


def find_duplicate_products(connection, image_sha256):
    if not image_sha256:
        return []

    return connection.execute(
        """
        SELECT id, artisan_id
        FROM products
        WHERE image_sha256 = ?
        ORDER BY id DESC
        """,
        (image_sha256,),
    ).fetchall()


def migrate_product_schema(connection):
    product_columns = {
        row["name"]
        for row in connection.execute(
            "PRAGMA table_info(products)"
        ).fetchall()
    }

    product_migrations = {
        "selling_price": "REAL",
        "stock_quantity": "INTEGER NOT NULL DEFAULT 1",
        "image_url": "TEXT",
        "detail_focus_json": "TEXT",
        "ai_confidence_score": "REAL",
        "ai_risk_score": "REAL",
        "ai_checks_json": "TEXT",
        "ai_decision_reason": "TEXT",
        "image_sha256": "TEXT",
        "image_phash": "TEXT",
        "length": "REAL",
        "width": "REAL",
        "height": "REAL",
        "dimension_unit": "TEXT DEFAULT 'cm'",
        "reported_count": "INTEGER NOT NULL DEFAULT 0",
        "reviewed_by": "INTEGER",
        "reviewed_at": "TEXT",
        "updated_at": "TEXT",
    }

    for column_name, column_definition in product_migrations.items():
        if column_name not in product_columns:
            connection.execute(
                f"ALTER TABLE products ADD COLUMN {column_name} {column_definition}"
            )

    connection.execute(
        """
        UPDATE products
        SET selling_price = suggested_price
        WHERE selling_price IS NULL OR selling_price <= 0
        """
    )

    products_without_hash = connection.execute(
        """
        SELECT id, image_url
        FROM products
        WHERE image_url IS NOT NULL
          AND TRIM(image_url) != ''
          AND (image_sha256 IS NULL OR TRIM(image_sha256) = '')
        """
    ).fetchall()

    for product in products_without_hash:
        image_path = get_uploaded_image_path(product["image_url"])

        if image_path is not None:
            connection.execute(
                """
                UPDATE products
                SET image_sha256 = ?
                WHERE id = ?
                """,
                (
                    calculate_file_sha256(image_path),
                    product["id"],
                ),
            )

    connection.execute(
        """
        UPDATE products
        SET status = CASE
            WHEN LOWER(status) = 'published' THEN 'approved'
            WHEN LOWER(status) = 'draft' THEN 'pending_ai_check'
            WHEN LOWER(status) IN (
                'pending_ai_check',
                'approved',
                'admin_review',
                'rejected',
                'under_review'
            ) THEN LOWER(status)
            ELSE 'admin_review'
        END
        """
    )

    connection.execute(
        """
        UPDATE products
        SET updated_at = COALESCE(updated_at, created_at)
        """
    )


def create_image_data_url(image_url):
    """Convert one of our uploaded images into a Gemini-ready data URL."""
    image_data = get_uploaded_image_bytes(image_url)
    if image_data is None:
        return ""

    file_bytes, mime_type = image_data
    encoded_image = base64.b64encode(file_bytes).decode("ascii")

    return f"data:{mime_type};base64,{encoded_image}"


@app.get("/")
def home():
    return jsonify(
        {
            "message": "KarigarSetu AI Backend",
            "status": "running",
        }
    )


@app.get("/api/health")
def health_check():
    return jsonify(
        {
            "success": True,
            "message": "Backend API and database are working",
        }
    )


@app.post("/api/artisans")
def create_artisan():
    data = request.form

    required_fields = [
        "name",
        "phone",
        "language",
        "craftType",
        "location",
        "experience",
        "email",
        "address",
        "password",
    ]

    missing_fields = [
        field
        for field in required_fields
        if str(data.get(field, "")).strip() == ""
    ]

    if missing_fields:
        return jsonify(
            {
                "success": False,
                "error_code": "REQUIRED_FIELDS_MISSING",
                "message": "Required information is missing",
                "missingFields": missing_fields,
            }
        ), 400

    proof_1 = request.files.get("proofImage1")
    proof_2 = request.files.get("proofImage2")
    proof_video = request.files.get("proofVideo")
    if not proof_1 or not proof_2 or not proof_video:
        return jsonify({
            "success": False,
            "error_code": "PROOF_FILES_REQUIRED",
            "message": "Upload 2 photos of your crafts and 1 video of you making them.",
        }), 400
    if not is_allowed_image(proof_1.filename) or not is_allowed_image(proof_2.filename):
        return jsonify({
            "success": False,
            "error_code": "INVALID_FILE_FORMAT",
            "message": "Photos must be PNG, JPG, or WEBP.",
        }), 400
    video_ext = proof_video.filename.rsplit(".", 1)[-1].lower() if "." in proof_video.filename else ""
    if video_ext not in ALLOWED_VIDEO_EXTENSIONS:
        return jsonify({
            "success": False,
            "error_code": "INVALID_FILE_FORMAT",
            "message": "Video must be MP4, WEBM, or MOV.",
        }), 400

    def save_proof(upload, folder, resource_type):
        if not os.environ.get("CLOUDINARY_URL"):
            raise RuntimeError("CLOUDINARY_URL is not configured")

        result = cloudinary.uploader.upload(
            upload,
            resource_type=resource_type,
            folder=folder,
            use_filename=False,
            unique_filename=True,
            overwrite=False,
        )
        return result["secure_url"]

    proof_image_1 = save_proof(
        proof_1, "karigarsetu/artisan-proofs", "image"
    )
    proof_image_2 = save_proof(
        proof_2, "karigarsetu/artisan-proofs", "image"
    )
    proof_video_url = save_proof(
        proof_video, "karigarsetu/artisan-proofs", "video"
    )
    connection = get_database()

    try:
        cursor = connection.execute(
            """
            INSERT INTO artisans (
                name,
                phone,
                language,
                craft_type,
                location,
                experience,
                email,
                address,
                password_hash,
                verification_status,
                proof_image_1,
                proof_image_2,
                proof_video
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            """,
            (
                data["name"].strip(),
                data["phone"].strip(),
                data["language"].strip(),
                data["craftType"].strip(),
                data["location"].strip(),
                int(data["experience"]),
                data["email"].strip().lower(),
                data["address"].strip(),
                generate_password_hash(data["password"]),
                proof_image_1,
                proof_image_2,
                proof_video_url,
            ),
        )

        connection.commit()
        artisan_id = cursor.lastrowid

        return jsonify(
            {
                "success": True,
                "error_code": "APPLICATION_SUBMITTED",
                "message": "Application submitted to Admin. You can log in once approved.",
                "artisanId": artisan_id,
                "status": "pending",
            }
        ), 201

    except sqlite3.IntegrityError:
        return jsonify(
            {
                "success": False,
                "error_code": "PHONE_ALREADY_REGISTERED",
                "message": "This mobile number is already registered",
            }
        ), 409

    finally:
        connection.close()


@app.get("/api/artisans")
def get_artisans():
    connection = get_database()

    artisans = connection.execute(
        """
        SELECT
            id,
            name,
            phone,
            language,
            craft_type,
            location,
            experience,
            created_at
        FROM artisans
        ORDER BY id DESC
        """
    ).fetchall()

    connection.close()

    return jsonify(
        {
            "success": True,
            "artisans": [dict(artisan) for artisan in artisans],
        }
    )


@app.post("/api/artisans/login")
def login_artisan():
    data = request.get_json(silent=True) or {}
    phone = re.sub(r"\D", "", str(data.get("phone", "")))
    password = str(data.get("password", ""))

    if len(phone) != 10:
        return jsonify(
            {
                "success": False,
                "error_code": "INVALID_PHONE",
                "message": "Enter a valid 10-digit mobile number",
            }
        ), 400

    connection = get_database()
    artisan = connection.execute(
        """
        SELECT
            id,
            name,
            phone,
            language,
            craft_type,
            location,
            experience,
            email,
            address,
            password_hash,
            verification_status
        FROM artisans
        WHERE phone = ?
        """,
        (phone,),
    ).fetchone()
    connection.close()

    if artisan is None:
        return jsonify(
            {
                "success": False,
                "error_code": "ARTISAN_NOT_FOUND",
                "message": "No artisan account was found with this mobile number",
            }
        ), 404

    if artisan["verification_status"] != "approved":
        status = artisan["verification_status"]
        if status == "banned":
            error_code = "ACCOUNT_BANNED"
            message = "This artisan account has been banned. Please contact the administrator."
        elif status == "rejected":
            error_code = "ACCOUNT_REJECTED"
            message = "Your artisan application was not approved by Admin."
        elif status == "pending":
            error_code = "PENDING_APPROVAL"
            message = "Your application is still awaiting Admin approval."
        else:
            error_code = "NOT_APPROVED"
            message = "Only Admin-approved artisans can sign in."

        return jsonify({
            "success": False,
            "status": status,
            "error_code": error_code,
            "message": message,
        }), 403

    if not artisan["password_hash"] or not check_password_hash(artisan["password_hash"], password):
        return jsonify({
            "success": False,
            "error_code": "INVALID_PASSWORD",
            "message": "Incorrect password. Please try again.",
        }), 401

    session.clear()
    session.permanent = True
    session.update({"user_id": artisan["id"], "user_role": "artisan"})

    return jsonify(
        {
            "success": True,
            "artisan": {
                "id": artisan["id"],
                "name": artisan["name"],
                "phone": artisan["phone"],
                "language": artisan["language"],
                "craftType": artisan["craft_type"],
                "location": artisan["location"],
                "experience": artisan["experience"],
                "email": artisan["email"],
                "address": artisan["address"],
                "verificationStatus": "approved",
            },
        }
    )


@app.get("/api/artisans/me")
def artisan_me():
    if session.get("user_role") != "artisan":
        return jsonify({"success": False, "authenticated": False}), 401
    connection = get_database()
    artisan = connection.execute(
        "SELECT id, name, phone, email, address, language, craft_type, location, experience, verification_status FROM artisans WHERE id = ?",
        (session.get("user_id"),),
    ).fetchone()
    connection.close()
    if artisan is None or artisan["verification_status"] != "approved":
        session.clear()
        return jsonify({"success": False, "authenticated": False}), 403
    return jsonify({"success": True, "authenticated": True, "artisan": dict(artisan)})


@app.post("/api/artisans/logout")
def artisan_logout():
    session.clear()
    return jsonify({"success": True})

@app.post("/api/products")
def create_product():
    data = request.get_json(silent=True) or {}

    if session.get("user_role") != "artisan":
        return jsonify({"success": False, "message": "Approved Artisan login required"}), 401
    data["artisanId"] = session.get("user_id")

    required_fields = [
        "artisanId",
        "productName",
        "category",
        "description",
        "materialCost",
        "labourCost",
        "imageUrl",
    ]

    missing_fields = [
        field
        for field in required_fields
        if str(data.get(field, "")).strip() == ""
    ]

    if missing_fields:
        return jsonify(
            {
                "success": False,
                "message": "Required product information is missing",
                "missingFields": missing_fields,
            }
        ), 400

    try:
        artisan_id = int(data["artisanId"])
        material_cost = float(data["materialCost"])
        labour_cost = float(data["labourCost"])
    except (TypeError, ValueError):
        return jsonify(
            {
                "success": False,
                "message": "Invalid artisan ID or cost information",
            }
        ), 400

    if material_cost < 0 or labour_cost < 0:
        return jsonify(
            {
                "success": False,
                "message": "Product costs cannot be negative",
            }
        ), 400

    professional_listing = data.get("listingMode") == "professional"
    ai_suggested_price = parse_ai_suggested_price(
        data.get("suggestedPrice")
    )

    if ai_suggested_price is None and not professional_listing:
        return jsonify(
            {
                "success": False,
                "message": "Enter a valid selling price greater than zero.",
            }
        ), 400

    product_name = str(data["productName"]).strip()
    category = str(data["category"]).strip()
    description = str(data["description"]).strip()

    if not 3 <= len(product_name) <= 120:
        return jsonify(
            {
                "success": False,
                "message": "Product name must be between 3 and 120 characters",
            }
        ), 400

    if not 20 <= len(description) <= 2000:
        return jsonify(
            {
                "success": False,
                "message": "Product description must be between 20 and 2000 characters",
            }
        ), 400

    image_url = str(data["imageUrl"]).strip()
    image_data = get_uploaded_image_bytes(image_url)

    if image_data is None:
        return jsonify(
            {
                "success": False,
                "message": "Uploaded product image was not found",
            }
        ), 400

    image_sha256 = calculate_bytes_sha256(image_data[0])

    raw_detail_focus = data.get("detailFocus")
    if isinstance(raw_detail_focus, dict):
        try:
            detail_focus = {
                "x": max(5, min(95, float(raw_detail_focus.get("x", 50)))),
                "y": max(5, min(95, float(raw_detail_focus.get("y", 50)))),
            }
        except (TypeError, ValueError):
            detail_focus = {"x": 50, "y": 50}
    else:
        detail_focus = {"x": 50, "y": 50}
    detail_focus_json = json.dumps(detail_focus)

    suggested_price = ai_suggested_price

    connection = get_database()

    artisan = connection.execute(
        "SELECT id, verification_status FROM artisans WHERE id = ?",
        (artisan_id,),
    ).fetchone()

    if artisan is None:
        connection.close()

        return jsonify(
            {
                "success": False,
                "message": "Artisan profile not found",
            }
        ), 404

    if artisan["verification_status"] != "approved":
        connection.close()
        return jsonify({"success": False, "message": "Artisan account requires Admin approval"}), 403

    duplicate_products = find_duplicate_products(
        connection,
        image_sha256,
    )
    duplicate_detected = len(duplicate_products) > 0
    approval_check = data.get("approvalCheck")
    # Never trust a score sent by the browser. Re-check the actual uploaded
    # image on the server for every Smart Catalog and Professional Studio
    # listing, so a teddy bear cannot inherit a handmade score and a genuine
    # terracotta idol gets a fresh image-based decision.
    try:
        ai_result = generate_catalog_with_gemini(data, image_data)
        generated_approval_check = ai_result["catalog"].get("approvalCheck")
        if not isinstance(generated_approval_check, dict):
            raise ValueError("AI verification score was missing")
        if (
            parse_ai_score(generated_approval_check.get("confidenceScore")) is None
            or parse_ai_score(generated_approval_check.get("handmadeProductProbability")) is None
        ):
            raise ValueError("AI verification scores were incomplete")
        approval_check = generated_approval_check

        # Professional Studio asks the server for the final AI price. Smart
        # Catalog keeps the price the artisan reviewed before publishing.
        if professional_listing:
            suggested_price = parse_ai_suggested_price(
                ai_result["catalog"].get("suggestedPrice")
            )
            if suggested_price is None:
                raise ValueError("AI suggested price was missing")
    except ValueError:
        connection.close()
        return jsonify({"success": False, "message": "AI verification is unavailable. Please try again later."}), 502

    selling_price = suggested_price
    if professional_listing and data.get("sellingPrice") is not None:
        selling_price = parse_ai_suggested_price(data["sellingPrice"])
        if selling_price is None:
            connection.close()
            return jsonify({"success": False, "message": "Enter a valid selling price greater than zero."}), 400

    def parse_optional_dimension(value):
        if value is None or value == "":
            return None
        try:
            num = float(value)
            return num if num >= 0 else None
        except (ValueError, TypeError):
            return None

    length = parse_optional_dimension(data.get("length"))
    width = parse_optional_dimension(data.get("width"))
    height = parse_optional_dimension(data.get("height"))
    dimension_unit = str(data.get("dimensionUnit") or data.get("dimension_unit") or "cm").strip()
    if dimension_unit not in {"cm", "in", "mm"}:
        dimension_unit = "cm"

    approval_decision = decide_product_approval(approval_check, duplicate_detected)
    initial_status = approval_decision["status"]
    initial_decision_reason = approval_decision["reason"]
    ai_checks_json = json.dumps(
        approval_decision["checks"],
        ensure_ascii=False,
    )

    cursor = connection.execute(
        """
        INSERT INTO products (
            artisan_id,
            product_name,
            category,
            description,
            material_cost,
            labour_cost,
            suggested_price,
            selling_price,
            stock_quantity,
            image_url,
            detail_focus_json,
            status,
            image_sha256,
            ai_confidence_score,
            ai_risk_score,
            ai_checks_json,
            ai_decision_reason,
            length,
            width,
            height,
            dimension_unit
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            artisan_id,
            product_name,
            category,
            description,
            material_cost,
            labour_cost,
            suggested_price,
            selling_price,
            1,
            image_url,
            detail_focus_json,
            initial_status,
            image_sha256,
            approval_decision["confidence_score"],
            approval_decision["risk_score"],
            ai_checks_json,
            initial_decision_reason,
            length,
            width,
            height,
            dimension_unit,
        ),
    )

    connection.commit()
    product_id = cursor.lastrowid
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "Product saved successfully",
            "productId": product_id,
            "suggestedPrice": suggested_price,
            "sellingPrice": selling_price,
            "stockQuantity": 1,
            "status": initial_status,
            "duplicateImageDetected": duplicate_detected,
            "aiConfidenceScore": approval_decision["confidence_score"],
            "aiRiskScore": approval_decision["risk_score"],
            "decisionReason": initial_decision_reason,
        }
    ), 201


@app.get("/api/products")
def get_products():
    artisan_id = request.args.get("artisan_id")
    connection = get_database()

    if artisan_id:
        products = connection.execute(
            """
            SELECT *
            FROM products
            WHERE artisan_id = ?
            ORDER BY id DESC
            """,
            (artisan_id,),
        ).fetchall()
    else:
        products = connection.execute(
            """
            SELECT *
            FROM products
            ORDER BY id DESC
            """
        ).fetchall()

    connection.close()

    return jsonify(
        {
            "success": True,
            "products": [dict(product) for product in products],
        }
    )


def public_product(row):
    product = dict(row)
    try:
        detail_focus = json.loads(product.get("detail_focus_json") or "")
        if not isinstance(detail_focus, dict):
            raise ValueError("Invalid detail focus")
    except (TypeError, ValueError, json.JSONDecodeError):
        detail_focus = {"x": 50, "y": 50}

    return {
        "id": product["id"],
        "product_name": product["product_name"],
        "category": product["category"],
        "description": product["description"],
        "selling_price": product["selling_price"] or product["suggested_price"],
        "stock_quantity": product["stock_quantity"],
        "image_url": product["image_url"],
        "detail_focus": detail_focus,
        "artisan_id": product["artisan_id"],
        "artisan_name": product.get("artisan_name") or "Artisan",
        "artisan_location": product.get("artisan_location") or "",
        "created_at": product["created_at"],
        "length": product.get("length"),
        "width": product.get("width"),
        "height": product.get("height"),
        "dimension_unit": product.get("dimension_unit") or "cm",
    }


@app.get("/api/marketplace/products")
def marketplace_products():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip().lower()
    sort = request.args.get("sort", "newest").strip().lower()
    in_stock = request.args.get("in_stock", "").lower() == "true"
    try:
        min_price = float(request.args["min_price"]) if "min_price" in request.args else None
        max_price = float(request.args["max_price"]) if "max_price" in request.args else None
    except ValueError:
        return jsonify({"success": False, "message": "Invalid price filter"}), 400

    clauses = ["products.status = 'approved'"]
    values = []
    if category and category.lower() != "all":
        clauses.append("LOWER(products.category) = LOWER(?)")
        values.append(category)
    if search:
        clauses.append("(LOWER(products.product_name) LIKE ? OR LOWER(products.description) LIKE ? OR LOWER(artisans.name) LIKE ?)")
        pattern = f"%{search}%"
        values.extend([pattern, pattern, pattern])
    if min_price is not None:
        clauses.append("COALESCE(products.selling_price, products.suggested_price) >= ?")
        values.append(min_price)
    if max_price is not None:
        clauses.append("COALESCE(products.selling_price, products.suggested_price) <= ?")
        values.append(max_price)
    if in_stock:
        clauses.append("products.stock_quantity > 0")

    order_sql = {
        "price_asc": "COALESCE(products.selling_price, products.suggested_price) ASC",
        "price_desc": "COALESCE(products.selling_price, products.suggested_price) DESC",
        "newest": "products.id DESC",
        "popular": "products.id DESC",
    }.get(sort, "products.id DESC")
    connection = get_database()
    rows = connection.execute(
        f"""
        SELECT products.*, artisans.name AS artisan_name,
               artisans.location AS artisan_location
        FROM products
        LEFT JOIN artisans ON artisans.id = products.artisan_id
        WHERE {' AND '.join(clauses)}
        ORDER BY {order_sql}
        """,
        values,
    ).fetchall()
    connection.close()
    return jsonify({"success": True, "data": [public_product(row) for row in rows]})


@app.get("/api/marketplace/products/<int:product_id>")
def marketplace_product_details(product_id):
    connection = get_database()
    row = connection.execute(
        """
        SELECT products.*, artisans.name AS artisan_name,
               artisans.location AS artisan_location
        FROM products
        LEFT JOIN artisans ON artisans.id = products.artisan_id
        WHERE products.id = ? AND products.status = 'approved'
        """,
        (product_id,),
    ).fetchone()
    connection.close()
    if row is None:
        return jsonify({"success": False, "message": "Approved product not found"}), 404
    return jsonify({"success": True, "data": public_product(row)})


@app.get("/api/marketplace/artisans/<int:artisan_id>")
def marketplace_artisan(artisan_id):
    connection = get_database()
    artisan = connection.execute(
        "SELECT id, name, craft_type, location, experience, created_at FROM artisans WHERE id = ?",
        (artisan_id,),
    ).fetchone()
    if artisan is None:
        connection.close()
        return jsonify({"success": False, "message": "Artisan not found"}), 404
    rows = connection.execute(
        """
        SELECT products.*, artisans.name AS artisan_name,
               artisans.location AS artisan_location
        FROM products JOIN artisans ON artisans.id = products.artisan_id
        WHERE products.artisan_id = ? AND products.status = 'approved'
        ORDER BY products.id DESC
        """,
        (artisan_id,),
    ).fetchall()
    connection.close()
    return jsonify({"success": True, "data": {
        "id": artisan["id"], "name": artisan["name"],
        "craftType": artisan["craft_type"], "location": artisan["location"],
        "experience": artisan["experience"], "joinedDate": artisan["created_at"],
        "products": [public_product(row) for row in rows],
    }})


def customer_payload(row):
    return {key: row[key] for key in (
        "id", "customer_uid", "name", "mobile", "email", "address",
        "city", "district", "state", "pin_code"
    )}


@app.post("/api/customers/register")
def register_customer():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    mobile = re.sub(r"\D", "", str(data.get("mobile", "")))
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not name or not re.fullmatch(r"[6-9]\d{9}", mobile) or "@" not in email or len(password) < 8:
        return jsonify({"success": False, "message": "Valid name, mobile, email and 8-character password are required"}), 400
    connection = get_database()
    try:
        customer_uid = f"CUST-{secrets.token_hex(4).upper()}"
        cursor = connection.execute(
            """
            INSERT INTO customers (customer_uid, name, mobile, email, password_hash, address, city, district, state, pin_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (customer_uid, name, mobile, email, generate_password_hash(password),
             str(data.get("address", "")).strip(), str(data.get("city", "")).strip(),
             str(data.get("district", "")).strip(), str(data.get("state", "")).strip(),
             str(data.get("pinCode", data.get("pin_code", ""))).strip()),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM customers WHERE id = ?", (cursor.lastrowid,)).fetchone()
        session.clear(); session.permanent = True
        session.update({"user_id": row["id"], "user_role": "customer"})
        return jsonify({"success": True, "data": customer_payload(row)}), 201
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Mobile number or email is already registered"}), 409
    finally:
        connection.close()


@app.post("/api/customers/login")
def login_customer():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier", "")).strip().lower()
    password = str(data.get("password", ""))
    connection = get_database()
    row = connection.execute("SELECT * FROM customers WHERE LOWER(email) = ? OR mobile = ?", (identifier, re.sub(r"\D", "", identifier))).fetchone()
    connection.close()
    if row is None or row["status"] != "active" or not check_password_hash(row["password_hash"], password):
        return jsonify({"success": False, "message": "Invalid login credentials"}), 401
    session.clear(); session.permanent = True
    session.update({"user_id": row["id"], "user_role": "customer"})
    return jsonify({"success": True, "data": customer_payload(row)})


@app.get("/api/customers/me")
def current_customer():
    if session.get("user_role") != "customer":
        return jsonify({"success": False, "message": "Customer authentication required"}), 401
    connection = get_database()
    row = connection.execute("SELECT * FROM customers WHERE id = ?", (session.get("user_id"),)).fetchone()
    connection.close()
    if row is None:
        session.clear()
        return jsonify({"success": False, "message": "Customer not found"}), 401
    return jsonify({"success": True, "data": customer_payload(row)})


@app.post("/api/customers/logout")
def logout_customer_api():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})


def require_customer_id():
    if session.get("user_role") == "customer" and session.get("user_id"):
        return int(session["user_id"])
    auth_header = request.headers.get("X-Customer-Id")
    if auth_header:
        try:
            cid = int(auth_header)
            connection = get_database()
            row = connection.execute("SELECT id FROM customers WHERE id = ? AND status = 'active'", (cid,)).fetchone()
            connection.close()
            if row:
                return int(row["id"])
        except (ValueError, TypeError):
            pass
    return None


def require_message_user():
    role = session.get("user_role")
    user_id = session.get("user_id")
    if role in {"customer", "artisan"} and user_id:
        return role, int(user_id)
    cid = require_customer_id()
    if cid:
        return "customer", int(cid)
    return None, None


def message_payload(row, viewer_role=None):
    is_deleted_everyone = bool(row["deleted_for_everyone"]) if "deleted_for_everyone" in row.keys() else False
    sender_role = row["sender_role"]
    body = row["body"]
    
    if is_deleted_everyone:
        body = ""  # Replaced on client by translation placeholder

    return {
        "id": row["id"],
        "customer_id": row["customer_id"],
        "artisan_id": row["artisan_id"],
        "product_id": row["product_id"],
        "sender_role": sender_role,
        "body": body,
        "is_read": bool(row["is_read"]),
        "is_deleted_everyone": is_deleted_everyone,
        "deleted_at": row["deleted_at"] if "deleted_at" in row.keys() else None,
        "created_at": row["created_at"],
        "customer_name": row["customer_name"],
        "artisan_name": row["artisan_name"],
        "product_name": row["product_name"],
    }


@app.get("/api/messages")
def get_messages():
    role, user_id = require_message_user()
    if role is None:
        return jsonify({"success": False, "message": "Please log in to view messages"}), 401

    try:
        artisan_id = int(request.args.get("artisan_id", ""))
        customer_id = int(request.args.get("customer_id", "")) if request.args.get("customer_id") else None
        product_id = int(request.args.get("product_id", "")) if request.args.get("product_id") else None
    except ValueError:
        return jsonify({"success": False, "message": "Invalid conversation"}), 400

    if role == "customer":
        customer_id = user_id
    elif artisan_id != user_id or not customer_id:
        return jsonify({"success": False, "message": "This conversation is not available"}), 403

    connection = get_database()
    try:
        delete_filter = "m.deleted_for_customer = 0" if role == "customer" else "m.deleted_for_artisan = 0"
        query = f"""
            SELECT m.*, c.name AS customer_name, a.name AS artisan_name,
                   p.product_name AS product_name
            FROM marketplace_messages m
            JOIN customers c ON c.id = m.customer_id
            JOIN artisans a ON a.id = m.artisan_id
            LEFT JOIN products p ON p.id = m.product_id
            WHERE m.customer_id = ? AND m.artisan_id = ? AND {delete_filter}
        """
        values = [customer_id, artisan_id]
        if product_id:
            query += " AND m.product_id = ?"
            values.append(product_id)
        query += " ORDER BY m.created_at ASC, m.id ASC"
        rows = connection.execute(query, tuple(values)).fetchall()
        connection.execute(
            """
            UPDATE marketplace_messages SET is_read = 1
            WHERE customer_id = ? AND artisan_id = ? AND sender_role <> ?
            """,
            (customer_id, artisan_id, role),
        )
        connection.commit()
        return jsonify({"success": True, "data": [message_payload(row, role) for row in rows]})
    finally:
        connection.close()


@app.get("/api/messages/inbox")
def get_messages_inbox():
    role, user_id = require_message_user()
    if role is None:
        return jsonify({"success": False, "message": "Please log in to view messages"}), 401

    connection = get_database()
    try:
        if role == "customer":
            rows = connection.execute(
                """
                SELECT m.*, c.name AS customer_name, a.name AS artisan_name, p.product_name AS product_name
                FROM marketplace_messages m
                JOIN customers c ON c.id = m.customer_id
                JOIN artisans a ON a.id = m.artisan_id
                LEFT JOIN products p ON p.id = m.product_id
                WHERE m.customer_id = ? AND m.deleted_for_customer = 0
                ORDER BY m.created_at DESC, m.id DESC
                """, (user_id,)
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT m.*, c.name AS customer_name, a.name AS artisan_name, p.product_name AS product_name
                FROM marketplace_messages m
                JOIN customers c ON c.id = m.customer_id
                JOIN artisans a ON a.id = m.artisan_id
                LEFT JOIN products p ON p.id = m.product_id
                WHERE m.artisan_id = ? AND m.deleted_for_artisan = 0
                ORDER BY m.created_at DESC, m.id DESC
                """, (user_id,)
            ).fetchall()

        conversations = {}
        for row in rows:
            key = f"{row['customer_id']}:{row['artisan_id']}:{row['product_id'] or 0}"
            item = conversations.get(key)
            if item is None:
                item = message_payload(row, role)
                item["unread_count"] = 0
                conversations[key] = item
            if row["sender_role"] != role and not row["is_read"]:
                item["unread_count"] += 1
        return jsonify({"success": True, "data": list(conversations.values())})
    finally:
        connection.close()


@app.post("/api/messages")
def send_message():
    role, user_id = require_message_user()
    if role is None:
        return jsonify({"success": False, "message": "Please log in to send a message"}), 401

    data = request.get_json(silent=True) or {}
    body = str(data.get("body", "")).strip()
    if not body or len(body) > 1500:
        return jsonify({"success": False, "message": "Message must be between 1 and 1500 characters"}), 400
    try:
        product_id = int(data["product_id"]) if data.get("product_id") else None
        if role == "customer":
            customer_id, artisan_id = user_id, int(data["artisan_id"])
        else:
            customer_id, artisan_id = int(data["customer_id"]), user_id
    except (KeyError, TypeError, ValueError):
        return jsonify({"success": False, "message": "A valid conversation is required"}), 400

    connection = get_database()
    try:
        valid_customer = connection.execute("SELECT id FROM customers WHERE id = ? AND status = 'active'", (customer_id,)).fetchone()
        valid_artisan = connection.execute("SELECT id FROM artisans WHERE id = ? AND verification_status = 'approved'", (artisan_id,)).fetchone()
        if valid_customer is None or valid_artisan is None:
            return jsonify({"success": False, "message": "This buyer or artisan is unavailable"}), 404
        if product_id:
            product = connection.execute("SELECT id, artisan_id FROM products WHERE id = ?", (product_id,)).fetchone()
            if product is None or product["artisan_id"] != artisan_id:
                return jsonify({"success": False, "message": "Product does not belong to this artisan"}), 400
        cursor = connection.execute(
            """
            INSERT INTO marketplace_messages (customer_id, artisan_id, product_id, sender_role, body)
            VALUES (?, ?, ?, ?, ?)
            """, (customer_id, artisan_id, product_id, role, body)
        )
        message_id = cursor.lastrowid
        connection.commit()
        row = connection.execute(
            """
            SELECT m.*, c.name AS customer_name, a.name AS artisan_name, p.product_name AS product_name
            FROM marketplace_messages m
            JOIN customers c ON c.id = m.customer_id
            JOIN artisans a ON a.id = m.artisan_id
            LEFT JOIN products p ON p.id = m.product_id WHERE m.id = ?
            """, (message_id,)
        ).fetchone()
        return jsonify({"success": True, "data": message_payload(row, role)}), 201
    finally:
        connection.close()


@app.delete("/api/messages/<int:message_id>")
def delete_message(message_id):
    role, user_id = require_message_user()
    if role is None:
        return jsonify({"success": False, "message": "Please log in to delete messages"}), 401

    scope = request.args.get("scope", "me").strip().lower()
    if scope not in {"me", "everyone"}:
        return jsonify({"success": False, "message": "Invalid deletion scope. Use 'me' or 'everyone'"}), 400

    connection = get_database()
    try:
        row = connection.execute(
            """
            SELECT * FROM marketplace_messages WHERE id = ?
            """, (message_id,)
        ).fetchone()

        if row is None:
            return jsonify({"success": False, "message": "Message not found"}), 404

        # Verify access to this conversation
        if role == "customer" and row["customer_id"] != user_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403
        if role == "artisan" and row["artisan_id"] != user_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        if scope == "everyone":
            # Only the original sender can delete for everyone
            if row["sender_role"] != role:
                return jsonify({"success": False, "message": "Only the sender can delete this message for everyone"}), 403

            connection.execute(
                """
                UPDATE marketplace_messages
                SET deleted_for_everyone = 1, deleted_at = ?, body = ''
                WHERE id = ?
                """, (now_str, message_id)
            )
        else:
            # Delete for Me: hide only for the current user
            if role == "customer":
                connection.execute(
                    """
                    UPDATE marketplace_messages
                    SET deleted_for_customer = 1
                    WHERE id = ?
                    """, (message_id,)
                )
            else:
                connection.execute(
                    """
                    UPDATE marketplace_messages
                    SET deleted_for_artisan = 1
                    WHERE id = ?
                    """, (message_id,)
                )

        connection.commit()
        return jsonify({
            "success": True,
            "message": "Message deleted successfully",
            "data": {
                "id": message_id,
                "scope": scope,
                "deleted_for_everyone": scope == "everyone"
            }
        })
    finally:
        connection.close()



def custom_request_payload(row):
    return {
        "id": row["id"],
        "customer_id": row["customer_id"],
        "artisan_id": row["artisan_id"],
        "product_id": row["product_id"],
        "customization_details": row["customization_details"],
        "quantity": row["quantity"],
        "preferred_color": row["preferred_color"],
        "preferred_size": row["preferred_size"],
        "reference_image_url": row["reference_image_url"],
        "additional_note": row["additional_note"],
        "status": row["status"],
        "quoted_price": row["quoted_price"],
        "artisan_message": row["artisan_message"],
        "quoted_at": row["quoted_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "customer_name": row.get("customer_name") if "customer_name" in row.keys() else None,
        "customer_mobile": row.get("customer_mobile") if "customer_mobile" in row.keys() else None,
        "customer_email": row.get("customer_email") if "customer_email" in row.keys() else None,
        "artisan_name": row.get("artisan_name") if "artisan_name" in row.keys() else None,
        "artisan_location": row.get("artisan_location") if "artisan_location" in row.keys() else None,
        "product_name": row.get("product_name") if "product_name" in row.keys() else None,
        "product_image_url": row.get("product_image_url") if "product_image_url" in row.keys() else None,
    }


@app.post("/api/custom-requests")
def create_custom_request():
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    data = request.get_json(silent=True) or {}
    customization_details = str(data.get("customization_details", "")).strip()
    if not customization_details:
        return jsonify({"success": False, "message": "Customization details are required"}), 400

    try:
        artisan_id = int(data.get("artisan_id", 0))
        product_id = int(data.get("product_id")) if data.get("product_id") else None
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Invalid artisan, product or quantity"}), 400

    if artisan_id <= 0:
        return jsonify({"success": False, "message": "Artisan ID is required"}), 400

    if quantity <= 0:
        return jsonify({"success": False, "message": "Quantity must be at least 1"}), 400

    preferred_color = str(data.get("preferred_color", "")).strip() or None
    preferred_size = str(data.get("preferred_size", "")).strip() or None
    reference_image_url = str(data.get("reference_image_url", "")).strip() or None
    additional_note = str(data.get("additional_note", "")).strip() or None

    connection = get_database()
    try:
        artisan = connection.execute(
            "SELECT id, name FROM artisans WHERE id = ?",
            (artisan_id,),
        ).fetchone()
        if artisan is None:
            return jsonify({"success": False, "message": "Artisan not found"}), 404

        if product_id:
            prod = connection.execute(
                "SELECT id, artisan_id FROM products WHERE id = ?",
                (product_id,),
            ).fetchone()
            if prod is None or prod["artisan_id"] != artisan_id:
                return jsonify({"success": False, "message": "Product does not belong to this artisan"}), 400

        cursor = connection.execute(
            """
            INSERT INTO custom_product_requests (
                customer_id, artisan_id, product_id,
                customization_details, quantity, preferred_color,
                preferred_size, reference_image_url, additional_note,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (
                customer_id, artisan_id, product_id,
                customization_details, quantity, preferred_color,
                preferred_size, reference_image_url, additional_note,
            ),
        )
        request_id = cursor.lastrowid
        connection.commit()

        row = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.id = ?
            """,
            (request_id,),
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Custom product request submitted successfully",
            "data": custom_request_payload(row),
        }), 201
    finally:
        connection.close()


@app.get("/api/customer/custom-requests")
def list_customer_custom_requests():
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    connection = get_database()
    try:
        rows = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.customer_id = ?
            ORDER BY r.id DESC
            """,
            (customer_id,),
        ).fetchall()
        return jsonify({"success": True, "data": [custom_request_payload(row) for row in rows]})
    finally:
        connection.close()


@app.get("/api/customer/custom-requests/<int:request_id>")
def get_customer_custom_request(request_id):
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    connection = get_database()
    try:
        row = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.id = ? AND r.customer_id = ?
            """,
            (request_id, customer_id),
        ).fetchone()
        if row is None:
            return jsonify({"success": False, "message": "Custom request not found"}), 404
        return jsonify({"success": True, "data": custom_request_payload(row)})
    finally:
        connection.close()


@app.get("/api/artisan/custom-requests")
def list_artisan_custom_requests():
    if session.get("user_role") != "artisan" or not session.get("user_id"):
        return jsonify({"success": False, "message": "Artisan authentication required"}), 401
    artisan_id = int(session["user_id"])

    connection = get_database()
    try:
        rows = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.artisan_id = ?
            ORDER BY r.id DESC
            """,
            (artisan_id,),
        ).fetchall()
        return jsonify({"success": True, "data": [custom_request_payload(row) for row in rows]})
    finally:
        connection.close()


@app.post("/api/artisan/custom-requests/<int:request_id>/quote")
def quote_custom_request(request_id):
    if session.get("user_role") != "artisan" or not session.get("user_id"):
        return jsonify({"success": False, "message": "Artisan authentication required"}), 401
    artisan_id = int(session["user_id"])

    data = request.get_json(silent=True) or {}
    try:
        quoted_price = float(data.get("quoted_price", 0))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Valid quoted price is required"}), 400

    if quoted_price <= 0:
        return jsonify({"success": False, "message": "Quoted price must be greater than 0"}), 400

    artisan_message = str(data.get("artisan_message", "")).strip() or None

    connection = get_database()
    try:
        req = connection.execute(
            "SELECT * FROM custom_product_requests WHERE id = ?",
            (request_id,),
        ).fetchone()
        if req is None or req["artisan_id"] != artisan_id:
            return jsonify({"success": False, "message": "Custom request not found for this artisan"}), 404

        if req["status"] in {"accepted", "rejected", "ordered"}:
            return jsonify({"success": False, "message": f"Cannot quote request with status '{req['status']}'"}), 400

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        connection.execute(
            """
            UPDATE custom_product_requests
            SET status = 'quoted', quoted_price = ?, artisan_message = ?, quoted_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (round(quoted_price, 2), artisan_message, now_str, now_str, request_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.id = ?
            """,
            (request_id,),
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Quote sent successfully",
            "data": custom_request_payload(row),
        })
    finally:
        connection.close()


@app.post("/api/artisan/custom-requests/<int:request_id>/reject")
def reject_custom_request(request_id):
    if session.get("user_role") != "artisan" or not session.get("user_id"):
        return jsonify({"success": False, "message": "Artisan authentication required"}), 401
    artisan_id = int(session["user_id"])

    data = request.get_json(silent=True) or {}
    artisan_message = str(data.get("artisan_message", "")).strip() or None

    connection = get_database()
    try:
        req = connection.execute(
            "SELECT * FROM custom_product_requests WHERE id = ?",
            (request_id,),
        ).fetchone()
        if req is None or req["artisan_id"] != artisan_id:
            return jsonify({"success": False, "message": "Custom request not found for this artisan"}), 404

        if req["status"] in {"accepted", "ordered"}:
            return jsonify({"success": False, "message": f"Cannot reject request with status '{req['status']}'"}), 400

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        connection.execute(
            """
            UPDATE custom_product_requests
            SET status = 'rejected', artisan_message = COALESCE(?, artisan_message), updated_at = ?
            WHERE id = ?
            """,
            (artisan_message, now_str, request_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.id = ?
            """,
            (request_id,),
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Custom request rejected",
            "data": custom_request_payload(row),
        })
    finally:
        connection.close()


@app.post("/api/customer/custom-requests/<int:request_id>/accept")
def accept_custom_request(request_id):
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    connection = get_database()
    try:
        req = connection.execute(
            "SELECT * FROM custom_product_requests WHERE id = ?",
            (request_id,),
        ).fetchone()
        if req is None or req["customer_id"] != customer_id:
            return jsonify({"success": False, "message": "Custom request not found"}), 404

        if req["status"] != "quoted":
            return jsonify({"success": False, "message": "Only quoted requests can be accepted"}), 400

        if not req["quoted_price"] or req["quoted_price"] <= 0:
            return jsonify({"success": False, "message": "No valid quoted price available"}), 400

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        connection.execute(
            """
            UPDATE custom_product_requests
            SET status = 'accepted', updated_at = ?
            WHERE id = ?
            """,
            (now_str, request_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT r.*, c.name AS customer_name, c.mobile AS customer_mobile, c.email AS customer_email,
                   a.name AS artisan_name, a.location AS artisan_location,
                   p.product_name AS product_name, p.image_url AS product_image_url
            FROM custom_product_requests r
            JOIN customers c ON c.id = r.customer_id
            JOIN artisans a ON a.id = r.artisan_id
            LEFT JOIN products p ON p.id = r.product_id
            WHERE r.id = ?
            """,
            (request_id,),
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Quote accepted! You can now proceed to checkout.",
            "data": custom_request_payload(row),
        })
    finally:
        connection.close()


@app.post("/api/customers/orders")
def create_customer_order():
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    data = request.get_json(silent=True) or {}
    custom_request_id = data.get("custom_request_id")

    connection = get_database()
    try:
        connection.execute("BEGIN IMMEDIATE")
        customer = connection.execute(
            "SELECT * FROM customers WHERE id = ? AND status = 'active'",
            (customer_id,),
        ).fetchone()
        if customer is None:
            connection.rollback()
            return jsonify({"success": False, "message": "Customer account is not active"}), 403

        # Case 1: Custom Request Order Checkout
        if custom_request_id:
            try:
                custom_req_id = int(custom_request_id)
            except (TypeError, ValueError):
                connection.rollback()
                return jsonify({"success": False, "message": "Invalid custom request ID"}), 400

            req = connection.execute(
                """
                SELECT r.*, a.name AS artisan_name, p.product_name AS base_product_name, p.image_url AS base_image_url
                FROM custom_product_requests r
                JOIN artisans a ON a.id = r.artisan_id
                LEFT JOIN products p ON p.id = r.product_id
                WHERE r.id = ? AND r.customer_id = ?
                """,
                (custom_req_id, customer_id),
            ).fetchone()

            if req is None:
                connection.rollback()
                return jsonify({"success": False, "message": "Custom request not found"}), 404

            if req["status"] not in {"quoted", "accepted"}:
                connection.rollback()
                return jsonify({"success": False, "message": f"Custom request cannot be checked out with status '{req['status']}'"}), 400

            unit_price = float(req["quoted_price"] or 0)
            if unit_price <= 0:
                connection.rollback()
                return jsonify({"success": False, "message": "No valid quoted price on custom request"}), 400

            quantity = max(1, int(req["quantity"] or 1))
            total_amount = round(unit_price * quantity, 2)

            submitted_address = data.get("delivery_address")
            if isinstance(submitted_address, dict):
                address_parts = [
                    str(submitted_address.get(key, "")).strip()
                    for key in ("address", "city", "district", "state", "pin_code")
                ]
                delivery_address = ", ".join(filter(None, address_parts))
            else:
                delivery_address = ", ".join(filter(None, [
                    customer["address"], customer["city"], customer["district"],
                    customer["state"], customer["pin_code"],
                ]))

            if len(delivery_address) < 10:
                connection.rollback()
                return jsonify({"success": False, "message": "A complete delivery address is required"}), 400

            order_number = f"KS-CUST-{datetime.now().strftime('%y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
            cursor = connection.execute(
                """
                INSERT INTO customer_orders (
                    order_number, customer_id, total_amount, status, delivery_address
                ) VALUES (?, ?, ?, 'confirmed', ?)
                """,
                (order_number, customer_id, total_amount, delivery_address),
            )
            order_id = cursor.lastrowid

            custom_prod_name = f"Custom Craft: {req['base_product_name'] or 'Handmade Custom Order'}"
            custom_image = req["reference_image_url"] or req["base_image_url"] or ""

            # Insert order item (product_id can be base product ID or NULL)
            connection.execute(
                """
                INSERT INTO customer_order_items (
                    order_id, product_id, artisan_id, artisan_name,
                    product_name, unit_price, quantity, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order_id, req["product_id"] or 0, req["artisan_id"],
                    req["artisan_name"], custom_prod_name,
                    unit_price, quantity, custom_image,
                ),
            )

            # Mark custom request as ordered
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            connection.execute(
                """
                UPDATE custom_product_requests
                SET status = 'ordered', updated_at = ?
                WHERE id = ?
                """,
                (now_str, custom_req_id),
            )

            connection.commit()
            return jsonify({
                "success": True,
                "message": "Custom order confirmed successfully",
                "data": {"id": order_number, "total": total_amount, "status": "Confirmed"},
            }), 201

        # Case 2: Standard Catalog Products Checkout
        raw_items = data.get("items")
        if not isinstance(raw_items, list) or not raw_items:
            connection.rollback()
            return jsonify({"success": False, "message": "Your cart is empty"}), 400

        requested = {}
        try:
            for item in raw_items:
                product_id = int(item.get("product_id"))
                quantity = int(item.get("quantity"))
                if product_id <= 0 or quantity <= 0:
                    raise ValueError
                requested[product_id] = requested.get(product_id, 0) + quantity
        except (AttributeError, TypeError, ValueError):
            connection.rollback()
            return jsonify({"success": False, "message": "Every order item needs a valid product and quantity"}), 400

        products = []
        total_amount = 0.0
        for product_id, quantity in requested.items():
            product = connection.execute(
                """
                SELECT products.*, artisans.name AS artisan_name
                FROM products
                LEFT JOIN artisans ON artisans.id = products.artisan_id
                WHERE products.id = ? AND products.status = 'approved'
                """,
                (product_id,),
            ).fetchone()
            if product is None:
                connection.rollback()
                return jsonify({
                    "success": False,
                    "message": "A product in your cart is no longer available",
                    "product_id": product_id,
                    "available_stock": 0,
                }), 409

            available_stock = max(0, int(product["stock_quantity"] or 0))
            if quantity > available_stock:
                connection.rollback()
                return jsonify({
                    "success": False,
                    "message": f"Only {available_stock} unit(s) of {product['product_name']} are available",
                    "product_id": product_id,
                    "available_stock": available_stock,
                }), 409

            unit_price = float(product["selling_price"] or product["suggested_price"] or 0)
            total_amount += unit_price * quantity
            products.append((product, quantity, unit_price))

        submitted_address = data.get("delivery_address")
        if isinstance(submitted_address, dict):
            address_parts = [
                str(submitted_address.get(key, "")).strip()
                for key in ("address", "city", "district", "state", "pin_code")
            ]
            delivery_address = ", ".join(filter(None, address_parts))
        else:
            delivery_address = ", ".join(filter(None, [
                customer["address"], customer["city"], customer["district"],
                customer["state"], customer["pin_code"],
            ]))
        if len(delivery_address) < 10:
            connection.rollback()
            return jsonify({"success": False, "message": "A complete delivery address is required"}), 400
        order_number = f"KS-{datetime.now().strftime('%y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
        cursor = connection.execute(
            """
            INSERT INTO customer_orders (
                order_number, customer_id, total_amount, status, delivery_address
            ) VALUES (?, ?, ?, 'confirmed', ?)
            """,
            (order_number, customer_id, round(total_amount, 2), delivery_address),
        )
        order_id = cursor.lastrowid

        for product, quantity, unit_price in products:
            stock_update = connection.execute(
                """
                UPDATE products
                SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND stock_quantity >= ?
                """,
                (quantity, product["id"], quantity),
            )
            if stock_update.rowcount != 1:
                raise sqlite3.IntegrityError("Stock changed during checkout")
            connection.execute(
                """
                INSERT INTO customer_order_items (
                    order_id, product_id, artisan_id, artisan_name,
                    product_name, unit_price, quantity, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order_id, product["id"], product["artisan_id"],
                    product["artisan_name"], product["product_name"],
                    unit_price, quantity, product["image_url"],
                ),
            )

        connection.commit()
        return jsonify({
            "success": True,
            "message": "Order confirmed and stock updated",
            "data": {"id": order_number, "total": round(total_amount, 2), "status": "Confirmed"},
        }), 201
    except sqlite3.Error:
        connection.rollback()
        return jsonify({"success": False, "message": "Stock changed during checkout. Please try again."}), 409
    finally:
        connection.close()


@app.get("/api/customers/orders")
def list_customer_orders():
    customer_id = require_customer_id()
    if customer_id is None:
        return jsonify({"success": False, "message": "Customer authentication required"}), 401

    connection = get_database()
    order_rows = connection.execute(
        """
        SELECT id, order_number, total_amount, status, delivery_address, created_at
        FROM customer_orders WHERE customer_id = ? ORDER BY id DESC
        """,
        (customer_id,),
    ).fetchall()
    orders = []
    for order in order_rows:
        item_rows = connection.execute(
            """
            SELECT product_id, artisan_name, product_name,
                   unit_price AS selling_price, quantity, image_url
            FROM customer_order_items WHERE order_id = ? ORDER BY id
            """,
            (order["id"],),
        ).fetchall()
        orders.append({
            "id": order["order_number"],
            "created_at": order["created_at"],
            "status": str(order["status"]).replace("_", " ").title(),
            "total": order["total_amount"],
            "delivery_address": order["delivery_address"],
            "items": [dict(item) for item in item_rows],
        })
    connection.close()
    return jsonify({"success": True, "data": orders})


def record_admin_action(action, target_type=None, target_id=None):
    connection = get_database()
    connection.execute(
        "INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)",
        (g.current_admin["id"], action, target_type, target_id, request.remote_addr),
    )
    connection.commit(); connection.close()


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get("user_role") != "admin":
            code = 401 if not session.get("user_role") else 403
            return jsonify({"success": False, "message": "Admin authentication required"}), code
        connection = get_database()
        row = connection.execute(
            "SELECT id, username, email, name, role FROM admin_users WHERE id = ? AND is_active = 1",
            (session.get("user_id"),),
        ).fetchone()
        connection.close()
        if row is None:
            session.clear()
            return jsonify({"success": False, "message": "Admin session expired"}), 401
        g.current_admin = dict(row)
        return view(*args, **kwargs)
    return wrapped


@app.post("/api/admin/auth/login")
def admin_login():
    data = request.get_json(silent=True) or {}
    identifier = str(
        data.get("email", data.get("identifier", ""))
    ).strip().lower()
    password = str(data.get("password", ""))

    connection = get_database()
    row = connection.execute(
        """
        SELECT * FROM admin_users
        WHERE LOWER(email) = ? OR LOWER(username) = ?
        """,
        (identifier, identifier),
    ).fetchone()

    if row is None or not row["is_active"] or not check_password_hash(
        row["password_hash"], password
    ):
        connection.close()
        return jsonify({
            "success": False,
            "message": "Invalid administrator credentials",
        }), 401

    session.clear()
    session.permanent = True
    session["user_id"] = row["id"]
    session["user_role"] = "admin"

    connection.execute(
        """
        UPDATE admin_users
        SET last_login = CURRENT_TIMESTAMP, failed_attempts = 0
        WHERE id = ?
        """,
        (row["id"],),
    )

    connection.execute(
        """
        INSERT INTO admin_audit_logs
        (admin_id, action, target_type, target_id, ip_address)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            row["id"],
            "ADMIN_LOGIN",
            "admin_user",
            row["id"],
            request.remote_addr,
        ),
    )

    connection.commit()
    connection.close()

    return jsonify({
        "success": True,
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "username": row["username"],
            "role": "admin",
        },
    })

@app.get("/api/admin/auth/me")
@admin_required
def admin_me():
    return jsonify({"success": True, "authenticated": True, "user": g.current_admin})


@app.post("/api/admin/auth/logout")
@admin_required
def admin_logout():
    record_admin_action("ADMIN_LOGOUT", "admin_user", g.current_admin["id"])
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})


@app.get("/api/admin/audit-logs")
@admin_required
def get_admin_audit_logs():
    connection = get_database()
    rows = connection.execute(
        """
        SELECT l.*, u.name AS admin_name
        FROM admin_audit_logs l
        LEFT JOIN admin_users u ON u.id = l.admin_id
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 250
        """
    ).fetchall()
    connection.close()
    return jsonify({"success": True, "data": [dict(row) for row in rows]})


@app.get("/api/admin/artisan-applications")
@admin_required
def get_artisan_applications():
    connection = get_database()
    rows = connection.execute(
        """
        SELECT id, name, phone, email, address, language, craft_type,
               location, experience, proof_image_1, proof_image_2,
               proof_video, verification_status, review_note, created_at
        FROM artisans
        ORDER BY CASE verification_status WHEN 'pending' THEN 0 ELSE 1 END,
                 created_at DESC, id DESC
        """
    ).fetchall()
    connection.close()
    return jsonify({"success": True, "applications": [dict(row) for row in rows]})


@app.patch("/api/admin/artisan-applications/<int:artisan_id>")
@admin_required
def decide_artisan_application(artisan_id):
    data = request.get_json(silent=True) or {}
    decision = str(data.get("status", "")).strip().lower()
    if decision not in {"approved", "rejected", "banned"}:
        return jsonify({"success": False, "message": "Status must be approved, rejected or banned"}), 400
    connection = get_database()
    cursor = connection.execute(
        """
        UPDATE artisans
        SET verification_status = ?, review_note = ?, reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (decision, str(data.get("note", "")).strip(), g.current_admin["id"], artisan_id),
    )
    connection.commit(); connection.close()
    if cursor.rowcount == 0:
        return jsonify({"success": False, "message": "Artisan application not found"}), 404
    record_admin_action(f"ARTISAN_{decision.upper()}", "artisan", artisan_id)
    return jsonify({"success": True, "status": decision})


@app.get("/api/admin/dashboard")
@admin_required
def get_admin_dashboard():
    dashboard_view = str(
        request.args.get("view", "review")
    ).strip().lower()

    allowed_views = {
        "review",
        "rejected",
        "total",
        "auto_approved",
        "approved",
        "reported",
    }
    if dashboard_view not in allowed_views:
        dashboard_view = "review"

    connection = get_database()

    stats_row = connection.execute(
        """
        SELECT
            COUNT(*) AS total_products,
            SUM(
                CASE
                    WHEN status = 'approved' AND reviewed_by IS NULL
                    THEN 1 ELSE 0
                END
            ) AS auto_approved,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)
                AS approved_products,
            SUM(
                CASE
                    WHEN status IN (
                        'pending_ai_check',
                        'admin_review',
                        'under_review'
                    )
                    THEN 1 ELSE 0
                END
            ) AS pending_review,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)
                AS rejected,
            SUM(CASE WHEN reported_count > 0 THEN 1 ELSE 0 END)
                AS reported_products
        FROM products
        """
    ).fetchone()

    if dashboard_view == "total":
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            ORDER BY products.created_at DESC, products.id DESC
            """
        ).fetchall()
    elif dashboard_view == "auto_approved":
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            WHERE products.status = 'approved'
              AND products.reviewed_by IS NULL
            ORDER BY products.created_at DESC, products.id DESC
            """
        ).fetchall()
    elif dashboard_view == "approved":
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            WHERE products.status = 'approved'
            ORDER BY products.updated_at DESC, products.id DESC
            """
        ).fetchall()
    elif dashboard_view == "reported":
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            WHERE products.reported_count > 0
            ORDER BY products.reported_count DESC,
                     products.updated_at DESC,
                     products.id DESC
            """
        ).fetchall()
    elif dashboard_view == "rejected":
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            WHERE products.status = 'rejected'
            ORDER BY products.reviewed_at DESC, products.id DESC
            """
        ).fetchall()
    else:
        review_rows = connection.execute(
            """
            SELECT products.*, artisans.name AS artisan_name
            FROM products
            LEFT JOIN artisans ON artisans.id = products.artisan_id
            WHERE products.status IN (
                'pending_ai_check',
                'admin_review',
                'under_review'
            )
            OR (
                products.reported_count > 0
                AND products.status != 'rejected'
            )
            ORDER BY
                CASE WHEN products.reported_count > 0 THEN 0 ELSE 1 END,
                products.created_at DESC,
                products.id DESC
            """
        ).fetchall()

    connection.close()

    review_products = []
    for row in review_rows:
        product = dict(row)
        try:
            product["ai_checks"] = json.loads(
                product.get("ai_checks_json") or "{}"
            )
        except (TypeError, json.JSONDecodeError):
            product["ai_checks"] = {}
        review_products.append(product)

    return jsonify(
        {
            "success": True,
            "stats": {
                "totalProducts": stats_row["total_products"] or 0,
                "autoApproved": stats_row["auto_approved"] or 0,
                "approvedProducts": stats_row["approved_products"] or 0,
                "pendingReview": stats_row["pending_review"] or 0,
                "rejected": stats_row["rejected"] or 0,
                "reportedProducts": stats_row["reported_products"] or 0,
            },
            "products": review_products,
            "view": dashboard_view,
        }
    )


@app.patch("/api/admin/products/<int:product_id>/decision")
@admin_required
def update_admin_product_decision(product_id):
    data = request.get_json(silent=True) or {}
    requested_status = str(data.get("status", "")).strip().lower()

    admin_id = g.current_admin["id"]

    allowed_statuses = {"approved", "rejected", "under_review"}
    if requested_status not in allowed_statuses:
        return jsonify(
            {
                "success": False,
                "message": "Status must be approved, rejected or under_review",
            }
        ), 400

    connection = get_database()
    product = connection.execute(
        "SELECT id FROM products WHERE id = ?",
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    decision_note = str(data.get("decisionNote", "")).strip()
    connection.execute(
        """
        UPDATE products
        SET status = ?,
            ai_decision_reason = CASE
                WHEN ? != '' THEN ?
                ELSE ai_decision_reason
            END,
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            requested_status,
            decision_note,
            decision_note,
            admin_id,
            product_id,
        ),
    )
    connection.commit()
    connection.close()

    action = {
        "approved": "PRODUCT_APPROVED",
        "rejected": "PRODUCT_REJECTED",
        "under_review": "PRODUCT_RESTORED",
    }[requested_status]
    record_admin_action(action, "product", product_id)

    return jsonify(
        {
            "success": True,
            "message": "Admin decision saved successfully",
            "productId": product_id,
            "status": requested_status,
        }
    )


@app.post("/api/admin/products/bulk-approve")
@admin_required
def bulk_approve_products():
    data = request.get_json(silent=True) or {}
    raw_product_ids = data.get("productIds", data.get("product_ids"))
    admin_id = g.current_admin["id"]

    if not isinstance(raw_product_ids, list):
        return jsonify(
            {
                "success": False,
                "message": "productIds must be a list",
            }
        ), 400

    product_ids = []
    for value in raw_product_ids[:100]:
        try:
            product_id = int(value)
        except (TypeError, ValueError):
            continue
        if product_id > 0 and product_id not in product_ids:
            product_ids.append(product_id)

    if not product_ids:
        return jsonify(
            {
                "success": False,
                "message": "Select at least one valid product",
            }
        ), 400

    placeholders = ", ".join("?" for _ in product_ids)
    connection = get_database()
    cursor = connection.execute(
        f"""
        UPDATE products
        SET status = 'approved',
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN ({placeholders})
        AND status IN (
            'pending_ai_check',
            'admin_review',
            'under_review'
        )
        """,
        (admin_id, *product_ids),
    )
    connection.commit()
    approved_count = cursor.rowcount
    connection.close()
    record_admin_action("BULK_APPROVED", "product_batch", None)

    return jsonify(
        {
            "success": True,
            "message": "Selected products approved successfully",
            "approvedCount": approved_count,
        }
    )


@app.patch("/api/products/<int:product_id>/publish")
def publish_product(product_id):
    connection = get_database()

    product = connection.execute(
        "SELECT id, status FROM products WHERE id = ?",
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()

        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    current_status = product["status"]
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "Product is in the approval workflow",
            "productId": product_id,
            "status": current_status,
        }
    )


@app.patch("/api/products/<int:product_id>/unpublish")
def unpublish_product(product_id):
    artisan_id = get_request_artisan_id()

    if artisan_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Valid artisan ID is required",
            }
        ), 400

    connection = get_database()
    product = connection.execute(
        """
        SELECT id, artisan_id, status
        FROM products
        WHERE id = ?
        """,
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    if product["artisan_id"] != artisan_id:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "You cannot change this product",
            }
        ), 403

    if product["status"] != "approved":
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Only an approved product can be unpublished",
            }
        ), 400

    connection.execute(
        """
        UPDATE products
        SET status = 'unpublished',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (product_id,),
    )
    connection.commit()
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "Product unpublished successfully",
            "productId": product_id,
            "status": "unpublished",
        }
    )


@app.patch("/api/products/<int:product_id>/republish")
def republish_product(product_id):
    artisan_id = get_request_artisan_id()

    if artisan_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Valid artisan ID is required",
            }
        ), 400

    connection = get_database()
    product = connection.execute(
        """
        SELECT id, artisan_id, status
        FROM products
        WHERE id = ?
        """,
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    if product["artisan_id"] != artisan_id:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "You cannot change this product",
            }
        ), 403

    if product["status"] != "unpublished":
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Only an unpublished product can be republished",
            }
        ), 400

    connection.execute(
        """
        UPDATE products
        SET status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (product_id,),
    )
    connection.commit()
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "Product republished successfully",
            "productId": product_id,
            "status": "approved",
        }
    )


@app.patch("/api/products/<int:product_id>/stock-price")
def update_product_stock_price(product_id):
    artisan_id = get_request_artisan_id()

    if artisan_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Artisan login required",
            }
        ), 401

    data = request.get_json(silent=True) or {}

    try:
        stock_quantity = int(data.get("stockQuantity"))
        selling_price = float(data.get("sellingPrice"))
    except (TypeError, ValueError):
        return jsonify(
            {
                "success": False,
                "message": "Valid stock quantity and selling price are required",
            }
        ), 400

    if stock_quantity < 0:
        return jsonify(
            {
                "success": False,
                "message": "Stock quantity cannot be negative",
            }
        ), 400

    if selling_price <= 0:
        return jsonify(
            {
                "success": False,
                "message": "Selling price must be greater than zero",
            }
        ), 400

    connection = get_database()
    product = connection.execute(
        """
        SELECT id, artisan_id
        FROM products
        WHERE id = ?
        """,
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    if product["artisan_id"] != artisan_id:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "You cannot edit this product",
            }
        ), 403

    connection.execute(
        """
        UPDATE products
        SET stock_quantity = ?, selling_price = ?
        WHERE id = ?
        """,
        (stock_quantity, selling_price, product_id),
    )
    connection.commit()
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "Stock and selling price updated successfully",
            "productId": product_id,
            "stockQuantity": stock_quantity,
            "sellingPrice": selling_price,
        }
    )


@app.delete("/api/products/<int:product_id>")
def delete_product(product_id):
    artisan_id = get_request_artisan_id()

    if artisan_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Artisan authentication or valid artisan ID is required",
            }
        ), 401

    connection = get_database()
    product = connection.execute(
        """
        SELECT id, artisan_id, image_url
        FROM products
        WHERE id = ?
        """,
        (product_id,),
    ).fetchone()

    if product is None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Product not found",
            }
        ), 404

    if product["artisan_id"] != artisan_id:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "You cannot delete this product",
            }
        ), 403

    # Foreign-key safety check: prevent deleting products with existing customer order records
    order_item = connection.execute(
        "SELECT id FROM customer_order_items WHERE product_id = ? LIMIT 1",
        (product_id,),
    ).fetchone()
    if order_item is not None:
        connection.close()
        return jsonify(
            {
                "success": False,
                "message": "Cannot delete product with existing customer orders. You can unpublish it instead.",
            }
        ), 400

    # Safely clear optional product references in messages and custom requests before product deletion
    connection.execute(
        "UPDATE marketplace_messages SET product_id = NULL WHERE product_id = ?",
        (product_id,),
    )
    connection.execute(
        "UPDATE custom_product_requests SET product_id = NULL WHERE product_id = ?",
        (product_id,),
    )

    image_url = product["image_url"]

    other_image_reference = None

    if image_url:
        other_image_reference = connection.execute(
            """
            SELECT id
            FROM products
            WHERE image_url = ? AND id != ?
            LIMIT 1
            """,
            (image_url, product_id),
        ).fetchone()

        if other_image_reference is None:
            order_item_reference = connection.execute(
                """
                SELECT id
                FROM customer_order_items
                WHERE image_url = ?
                LIMIT 1
                """,
                (image_url,),
            ).fetchone()
            if order_item_reference is not None:
                other_image_reference = order_item_reference

        if other_image_reference is None:
            artisan_reference = connection.execute(
                """
                SELECT id
                FROM artisans
                WHERE proof_image_1 = ? OR proof_image_2 = ? OR proof_video = ?
                LIMIT 1
                """,
                (image_url, image_url, image_url),
            ).fetchone()
            if artisan_reference is not None:
                other_image_reference = artisan_reference

    connection.execute(
        "DELETE FROM products WHERE id = ?",
        (product_id,),
    )
    connection.commit()
    connection.close()

    if other_image_reference is None:
        try:
            remove_uploaded_image(image_url)
        except Exception as err:
            app.logger.warning(
                "Unexpected error during image cleanup for product %s: %s",
                product_id,
                err,
            )

    return jsonify(
        {
            "success": True,
            "message": "Product deleted successfully",
            "productId": product_id,
        }
    )


@app.post("/api/uploads")
def upload_product_image():
    """Upload the original craft image directly to Cloudinary.

    Do not run rembg/onnx on Render's Free instance: loading that model exceeds
    its memory limit and kills the Gunicorn worker.
    """
    if "image" not in request.files:
        return jsonify(
            {
                "success": False,
                "message": "No image was uploaded",
            }
        ), 400

    image = request.files["image"]

    if image.filename == "":
        return jsonify(
            {
                "success": False,
                "message": "No image was selected",
            }
        ), 400

    if not is_allowed_image(image.filename):
        return jsonify(
            {
                "success": False,
                "message": "Only PNG, JPG, JPEG and WEBP are allowed",
            }
        ), 400

    safe_name = secure_filename(image.filename)
    extension = safe_name.rsplit(".", 1)[1].lower()
    declared_format = (
        "jpeg" if extension in {"jpg", "jpeg"} else extension
    )

    file_bytes = image.read(MAX_IMAGE_SIZE_BYTES + 1)

    if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
        return jsonify(
            {
                "success": False,
                "message": "Image size must be 10 MB or less",
            }
        ), 413

    if len(file_bytes) < MIN_IMAGE_SIZE_BYTES:
        return jsonify(
            {
                "success": False,
                "message": "Image file is empty or too small",
            }
        ), 400

    detected_format = detect_image_format(file_bytes)

    if detected_format is None:
        return jsonify(
            {
                "success": False,
                "message": "The uploaded file is not a valid PNG, JPG or WEBP image",
            }
        ), 400

    if detected_format != declared_format:
        return jsonify(
            {
                "success": False,
                "message": "Image extension does not match the actual file type",
            }
        ), 400

    image_sha256 = hashlib.sha256(file_bytes).hexdigest()
    connection = get_database()
    duplicate_products = find_duplicate_products(
        connection,
        image_sha256,
    )
    connection.close()
    duplicate_detected = len(duplicate_products) > 0

    if not os.environ.get("CLOUDINARY_URL"):
        return jsonify({
            "success": False,
            "message": "Cloudinary storage is not configured on the server.",
        }), 503

    try:
        upload_result = cloudinary.uploader.upload(
            BytesIO(file_bytes),
            resource_type="image",
            folder="karigarsetu/product-images",
            use_filename=False,
            unique_filename=True,
            overwrite=False,
        )
        image_url = upload_result["secure_url"]
    except Exception as error:
        app.logger.exception("Cloudinary product image upload failed")
        return jsonify({
            "success": False,
            "message": f"Image storage failed ({type(error).__name__}). Please try again.",
        }), 502

    return jsonify(
        {
            "success": True,
            "message": "Image uploaded successfully",
            "imageUrl": image_url,
            "imageSha256": image_sha256,
            "duplicateImageDetected": duplicate_detected,
            "duplicateImageCount": len(duplicate_products),
            "backgroundRemoved": False,
        }
    ), 201


@app.get("/uploads/<path:filename>")
def serve_product_image(filename):
    return send_from_directory(
        UPLOAD_FOLDER,
        filename,
    )
@app.post("/api/generate-catalog")
def generate_catalog():
    data = request.get_json(silent=True) or {}

    required_fields = [
        "productName",
        "category",
        "description",
        "materialCost",
        "labourCost",
        "imageUrl",
    ]

    missing_fields = [
        field
        for field in required_fields
        if data.get(field) in (None, "")
    ]

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required product information is missing",
            "missingFields": missing_fields,
        }), 400

    product_name = str(data["productName"]).strip()
    description = str(data["description"]).strip()

    if not 3 <= len(product_name) <= 120:
        return jsonify({
            "success": False,
            "message": "Product name must be between 3 and 120 characters",
        }), 400

    if not 20 <= len(description) <= 2000:
        return jsonify({
            "success": False,
            "message": "Product description must be between 20 and 2000 characters",
        }), 400

    try:
        material_cost = float(data["materialCost"])
        labour_cost = float(data["labourCost"])
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Material and labour costs must be valid numbers",
        }), 400

    if material_cost < 0 or labour_cost < 0:
        return jsonify({
            "success": False,
            "message": "Product costs cannot be negative",
        }), 400

    image_data = get_uploaded_image_bytes(data["imageUrl"])

    if image_data is None:
        return jsonify({
            "success": False,
            "message": "Uploaded product image পাওয়া যায়নি",
        }), 400

    image_sha256 = calculate_bytes_sha256(image_data[0])
    connection = get_database()
    duplicate_products = find_duplicate_products(
        connection,
        image_sha256,
    )
    connection.close()
    duplicate_detected = len(duplicate_products) > 0

    try:
        gemini_result = generate_catalog_with_gemini(
            {
                **data,
                "imageSha256": image_sha256,
                "duplicateImageDetected": duplicate_detected,
                "duplicateImageCount": len(duplicate_products),
            },
            image_data,
        )
        return jsonify(gemini_result), 200
    except ValueError as error:
        app.logger.error("Gemini catalog generation failed: %s", error)
        return jsonify({
            "success": False,
            "message": "Gemini AI catalog generation failed",
            "error": str(error),
        }), 502

def build_ai_assistant_context(user_role, user_id, current_route, product_id=None, artisan_id=None, custom_request_id=None):
    """Safely build sanitized internal database context for the AI Assistant."""
    context_data = {
        "role": user_role or "guest",
        "current_route": current_route or "/",
        "products_summary": [],
        "current_product": None,
        "current_artisan": None,
        "customer_orders_summary": [],
        "customer_custom_requests": [],
        "artisan_products_summary": [],
        "artisan_custom_requests": [],
    }

    connection = get_database()
    try:
        # 1. Fetch top approved products from marketplace for product-related assistance
        approved_rows = connection.execute(
            """
            SELECT p.id, p.product_name, p.category, p.description,
                   COALESCE(p.selling_price, p.suggested_price, 0) AS price,
                   p.stock_quantity, p.length, p.width, p.height, p.dimension_unit,
                   a.name AS artisan_name, a.location AS artisan_location
            FROM products p
            LEFT JOIN artisans a ON a.id = p.artisan_id
            WHERE p.status = 'approved'
            ORDER BY p.id DESC
            LIMIT 25
            """
        ).fetchall()
        context_data["products_summary"] = [
            {
                "id": r["id"],
                "name": r["product_name"],
                "category": r["category"],
                "price_inr": r["price"],
                "stock": r["stock_quantity"],
                "artisan": r["artisan_name"],
                "location": r["artisan_location"],
                "dimensions": f"{r['length'] or '-'}x{r['width'] or '-'}x{r['height'] or '-'} {r['dimension_unit'] or 'cm'}" if (r['length'] or r['width'] or r['height']) else "Not specified",
            }
            for r in approved_rows
        ]

        # 2. If specific product_id is provided or referenced in route
        target_prod_id = product_id
        if not target_prod_id and current_route and "/marketplace/products/" in current_route:
            try:
                target_prod_id = int(current_route.split("/marketplace/products/")[1].split("/")[0].split("?")[0])
            except (ValueError, IndexError):
                pass

        if target_prod_id:
            p_row = connection.execute(
                """
                SELECT p.id, p.product_name, p.category, p.description,
                       COALESCE(p.selling_price, p.suggested_price, 0) AS price,
                       p.stock_quantity, p.length, p.width, p.height, p.dimension_unit,
                       p.status, a.id AS artisan_id, a.name AS artisan_name, a.location AS artisan_location,
                       a.experience AS artisan_experience, a.craft_type AS artisan_craft
                FROM products p
                LEFT JOIN artisans a ON a.id = p.artisan_id
                WHERE p.id = ?
                """,
                (target_prod_id,),
            ).fetchone()
            if p_row:
                context_data["current_product"] = {
                    "id": p_row["id"],
                    "name": p_row["product_name"],
                    "category": p_row["category"],
                    "description": p_row["description"],
                    "price_inr": p_row["price"],
                    "stock": p_row["stock_quantity"],
                    "status": p_row["status"],
                    "dimensions": f"L: {p_row['length'] or '-'} cm, W: {p_row['width'] or '-'} cm, H: {p_row['height'] or '-'} {p_row['dimension_unit'] or 'cm'}",
                    "artisan_id": p_row["artisan_id"],
                    "artisan_name": p_row["artisan_name"],
                    "artisan_location": p_row["artisan_location"],
                }

        # 3. If specific artisan_id is provided
        target_artisan_id = artisan_id
        if not target_artisan_id and current_route and "/marketplace/artisans/" in current_route:
            try:
                target_artisan_id = int(current_route.split("/marketplace/artisans/")[1].split("/")[0].split("?")[0])
            except (ValueError, IndexError):
                pass

        if target_artisan_id:
            a_row = connection.execute(
                "SELECT id, name, craft_type, location, experience FROM artisans WHERE id = ?",
                (target_artisan_id,),
            ).fetchone()
            if a_row:
                context_data["current_artisan"] = {
                    "id": a_row["id"],
                    "name": a_row["name"],
                    "craft_type": a_row["craft_type"],
                    "location": a_row["location"],
                    "experience_years": a_row["experience"],
                }

        # 4. If logged-in Customer: fetch their own orders & custom requests
        if user_role == "customer" and user_id:
            c_orders = connection.execute(
                """
                SELECT id, order_number, total_amount, status, created_at
                FROM customer_orders
                WHERE customer_id = ?
                ORDER BY id DESC
                LIMIT 5
                """,
                (user_id,),
            ).fetchall()
            order_list = []
            for o in c_orders:
                items = connection.execute(
                    "SELECT product_name, quantity, unit_price FROM customer_order_items WHERE order_id = ?",
                    (o["id"],),
                ).fetchall()
                order_list.append({
                    "order_number": o["order_number"],
                    "status": str(o["status"]).replace("_", " ").title(),
                    "total_amount_inr": o["total_amount"],
                    "created_at": o["created_at"],
                    "items": [f"{it['product_name']} (Qty: {it['quantity']}, ₹{it['unit_price']})" for it in items],
                })
            context_data["customer_orders_summary"] = order_list

            c_requests = connection.execute(
                """
                SELECT r.id, r.status, r.quoted_price, r.quantity, r.customization_details,
                       a.name AS artisan_name, p.product_name
                FROM custom_product_requests r
                JOIN artisans a ON a.id = r.artisan_id
                LEFT JOIN products p ON p.id = r.product_id
                WHERE r.customer_id = ?
                ORDER BY r.id DESC
                LIMIT 5
                """,
                (user_id,),
            ).fetchall()
            context_data["customer_custom_requests"] = [
                {
                    "request_id": cr["id"],
                    "artisan": cr["artisan_name"],
                    "product": cr["product_name"] or "Custom Craft",
                    "details": cr["customization_details"],
                    "status": cr["status"],
                    "quoted_price_inr": cr["quoted_price"],
                }
                for cr in c_requests
            ]

        # 5. If logged-in Artisan: fetch their own product listings & custom requests
        if user_role == "artisan" and user_id:
            art_products = connection.execute(
                """
                SELECT id, product_name, category, status, stock_quantity,
                       COALESCE(selling_price, suggested_price, 0) AS price,
                       ai_confidence_score, ai_risk_score, ai_decision_reason
                FROM products
                WHERE artisan_id = ?
                ORDER BY id DESC
                LIMIT 10
                """,
                (user_id,),
            ).fetchall()
            context_data["artisan_products_summary"] = [
                {
                    "id": ap["id"],
                    "name": ap["product_name"],
                    "category": ap["category"],
                    "status": ap["status"],
                    "stock": ap["stock_quantity"],
                    "price_inr": ap["price"],
                    "ai_decision": ap["ai_decision_reason"] or "N/A",
                }
                for ap in art_products
            ]

            art_requests = connection.execute(
                """
                SELECT r.id, r.status, r.quoted_price, r.quantity, r.customization_details,
                       c.name AS customer_name, p.product_name
                FROM custom_product_requests r
                JOIN customers c ON c.id = r.customer_id
                LEFT JOIN products p ON p.id = r.product_id
                WHERE r.artisan_id = ?
                ORDER BY r.id DESC
                LIMIT 5
                """,
                (user_id,),
            ).fetchall()
            context_data["artisan_custom_requests"] = [
                {
                    "request_id": ar["id"],
                    "customer": ar["customer_name"],
                    "product": ar["product_name"] or "Custom Craft",
                    "details": ar["customization_details"],
                    "status": ar["status"],
                    "quoted_price_inr": ar["quoted_price"],
                }
                for ar in art_requests
            ]
    finally:
        connection.close()

    return context_data


def generate_fallback_ai_reply(user_message, language, user_role, context_data):
    """Provides instant, highly accurate rule-based responses if Gemini is unavailable or unconfigured."""
    msg_lower = user_message.lower()
    is_bn = language.startswith("bn")
    is_hi = language.startswith("hi")

    # Artisan questions
    if user_role == "artisan" or "add product" in msg_lower or "price suggestion" in msg_lower or "স্টুডিও" in msg_lower or "পণ্য যোগ" in msg_lower or "उत्पाद जोड़ें" in msg_lower:
        if "add" in msg_lower or "যোগ" in msg_lower or "जोड़" in msg_lower or "create" in msg_lower:
            if is_bn:
                return "কারিগর স্টুডিওতে গিয়ে '+ Add Craft' বা 'AI-Assisted Listing' এ ক্লিক করে আপনার হস্তশিল্পের ছবি তুলুন এবং ভয়েস বা লিখে বিবরণ দিন। এআই স্বয়ংক্রিয়ভাবে অনুমোদন ও ফেয়ার প্রাইস তৈরি করবে।"
            if is_hi:
                return "कारीगर स्टूडियो में जाकर '+ Add Craft' या 'AI-Assisted Listing' पर क्लिक करें। अपने हस्तशिल्प की फोटो अपलोड करें और बोलकर या लिखकर विवरण दें। एआई सही कीमत और विवरण सुझाएगा।"
            return "Go to Artisan Studio and click '+ Add Craft' or 'AI-Assisted Listing'. Upload your craft photo and speak/write the details. AI will assist with cataloging, authenticity check, and fair price calculation."

        if "price" in msg_lower or "মূল্য" in msg_lower or "कीमत" in msg_lower:
            if is_bn:
                return "এআই প্রস্তাবিত মূল্য (AI Suggested Price) কাঁচামালের খরচ, শ্রম এবং কারিগরির মানের ভিত্তিতে একটি ন্যায্য জীবনধারণ মজুরি (Living Wage) নির্ধারণ করে। এটি একটি নির্দেশিকা—কারিগর চাইলে নিজের পছন্দমতো বিক্রয়মূল্য নির্ধারণ করতে পারেন।"
            if is_hi:
                return "एआई सुझाई गई कीमत (AI Suggested Price) सामग्री की लागत, श्रम और शिल्प की गुणवत्ता के आधार पर उचित मजदूरी की गणना करती है। यह केवल एक सलाह है—कारीगर अपनी इच्छानुसार विक्रय मूल्य बदल सकते हैं।"
            return "The AI Suggested Price calculates a fair living wage based on raw material costs, labour hours, and craft intricacy. It is advisory, and artisans can review and set their final selling price."

        if "custom" in msg_lower or "কাস্টম" in msg_lower or "अनुरोध" in msg_lower or "quote" in msg_lower:
            requests = context_data.get("artisan_custom_requests", [])
            req_count = len(requests)
            if is_bn:
                return f"আপনার কারিগর ড্যাশবোর্ডে 'Custom Requests' ট্যাবে {req_count} টি অনুরোধ রয়েছে। সেখানে গিয়ে আপনি গ্রাহকের বিবরণ দেখে উদ্ধৃতি মূল্য (Quote Price) ও বার্তা পাঠাতে পারেন।"
            if is_hi:
                return f"आपके कारीगर डैशबोर्ड पर 'Custom Requests' टैब में {req_count} अनुरोध हैं। आप ग्राहक का विवरण देखकर कोटेड प्राइस और संदेश भेज सकते हैं।"
            return f"You have {req_count} custom requests in your Artisan Dashboard under 'Custom Requests'. You can review buyer preferences and submit a custom price quote."

    # Customer questions
    if "order" in msg_lower or "অর্ডার" in msg_lower or "ऑर्डर" in msg_lower:
        orders = context_data.get("customer_orders_summary", [])
        if user_role != "customer":
            if is_bn:
                return "আপনার অর্ডার দেখতে অনুগ্রহ করে কাস্টমার হিসেবে লগইন করুন এবং উপরের 'My Orders' সেকশনে যান।"
            if is_hi:
                return "अपने ऑर्डर देखने के लिए कृपया कस्टमर के रूप में लॉगिन करें और 'My Orders' सेक्शन देखें।"
            return "Please log in as a customer and visit 'My Orders' in the navigation bar to track all your orders."
        if not orders:
            if is_bn:
                return "আপনার অ্যাকাউন্টে বর্তমানে কোনো অর্ডার নেই। মার্কেটপ্লেস ঘুরে খাঁটি হস্তশিল্প পণ্য অর্ডার করতে পারেন।"
            if is_hi:
                return "आपके खाते में फिलहाल कोई सक्रिय ऑर्डर नहीं है। आप मार्केटप्लेस से पसंदीदा हस्तशिल्प खरीद सकते हैं।"
            return "You currently have no orders. Browse the Marketplace to discover authentic handicrafts and place an order!"
        latest = orders[0]
        if is_bn:
            return f"আপনার সর্বশেষ অর্ডার #{latest['order_number']}-এর বর্তমান স্থিতি: {latest['status']} (মোট ₹{latest['total_amount_inr']})। বিস্তারিত দেখতে 'My Orders' পেজে যান।"
        if is_hi:
            return f"आपके नवीनतम ऑर्डर #{latest['order_number']} की वर्तमान स्थिति: {latest['status']} (कुल ₹{latest['total_amount_inr']})। अधिक विवरण के लिए 'My Orders' पर जाएँ।"
        return f"Your latest order #{latest['order_number']} status is: {latest['status']} (Total ₹{latest['total_amount_inr']}). View full tracking in 'My Orders'."

    if "custom" in msg_lower or "কাস্টম" in msg_lower or "অনুরোধ" in msg_lower or "अनुरोध" in msg_lower:
        if is_bn:
            return "যে কোনো পণ্যের বিবরণ পেজে গিয়ে 'Request Custom Product' বোতামে ক্লিক করুন। আপনার পছন্দমতো রঙ, সাইজ ও বিস্তারিত বিবরণ দিলে কারিগর সরাসরি কোটেশন দেবেন।"
        if is_hi:
            return "किसी भी उत्पाद विवरण पृष्ठ पर जाकर 'Request Custom Product' बटन पर क्लिक करें। अपना पसंदीदा रंग, आकार और आवश्यकताएं दर्ज करें, कारीगर आपको उचित कोटेशन भेजेंगे।"
        return "Visit any craft's Product Details page and click 'Request Custom Product'. Specify your preferred size, color, quantity, and notes. The artisan will respond with a tailored price quote."

    if "message" in msg_lower or "chat" in msg_lower or "মেসেজ" in msg_lower or "বার্তা" in msg_lower or "संदेश" in msg_lower:
        if is_bn:
            return "মার্কেটপ্লেসের যে কোনো পণ্যের পৃষ্ঠায় 'Message Artisan' বোতামে ক্লিক করে সরাসরি কারিগরের সাথে কথা বলতে পারেন।"
        if is_hi:
            return "मार्केटप्लेस के किसी भी उत्पाद पेज पर 'Message Artisan' बटन पर क्लिक करके कारीगर से सीधी बातचीत कर सकते हैं।"
        return "You can click the 'Message Artisan' button on any craft page to chat directly with the verified master artisan."

    # Product recommendations & search fallback
    products = context_data.get("products_summary", [])
    if products:
        sample_list = ", ".join([f"{p['name']} (₹{p['price_inr']})" for p in products[:4]])
        if is_bn:
            return f"কারিগরসেতু মার্কেটপ্লেসে বর্তমানে অনেকগুলো অনুমোদিত খাঁটি হস্তশিল্প রয়েছে, যেমন: {sample_list}। আপনি ক্যাটাগরি ও ফিল্টার ব্যবহার করে আরও পণ্য দেখতে পারেন।"
        if is_hi:
            return f"कारीगरसेतु मार्केटप्लेस पर वर्तमान में प्रामाणिक हस्तशिल्प उपलब्ध हैं, जैसे: {sample_list}। आप मार्केटप्लेस पर जाकर फिल्टर का उपयोग कर सकते हैं।"
        return f"KarigarSetu features authentic artisan crafts including: {sample_list}. You can explore, filter by price, or message artisans directly!"

    if is_bn:
        return "নমস্কার! আমি কারিগরসেতু এআই সহকারী। হস্তশিল্প পণ্য, মূল্য, অর্ডার, বা কারিগরদের সাথে যোগাযোগ সংক্রান্ত যে কোনো তথ্য জানতে আমাকে জিজ্ঞাসা করতে পারেন।"
    if is_hi:
        return "नमस्ते! मैं कारीगरसेतु एआई सहायक हूँ। आप हस्तशिल्प उत्पादों, कीमतों, ऑर्डर की स्थिति, या कारीगरों से संपर्क के बारे में कुछ भी पूछ सकते हैं।"
    return "Namaste! I am the KarigarSetu AI Assistant. Feel free to ask about our handcrafted products, artisan stories, custom requests, pricing, or order tracking!"


@app.post("/api/ai-assistant/chat")
def ai_assistant_chat():
    """Context-aware Multilingual AI Chat Assistant for KarigarSetu (Advisory & Read-Only)."""
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    language = str(data.get("language", "en-IN")).strip()
    current_route = str(data.get("current_route", "/")).strip()
    product_id = data.get("product_id")
    artisan_id = data.get("artisan_id")
    custom_request_id = data.get("custom_request_id")

    if not message:
        return jsonify({
            "success": False,
            "message": "Message is required",
        }), 400

    if len(message) > 1000:
        return jsonify({
            "success": False,
            "message": "Message is too long (maximum 1000 characters)",
        }), 400

    # Determine user identity securely from session/headers
    user_role, user_id = require_message_user()

    # Collect live backend context safely
    context_data = build_ai_assistant_context(
        user_role=user_role,
        user_id=user_id,
        current_route=current_route,
        product_id=product_id,
        artisan_id=artisan_id,
        custom_request_id=custom_request_id,
    )

    lang_instructions = {
        "bn-IN": "Respond strictly in fluent, natural Bengali (বাংলা). Use respectful terms (e.g., আপনি, নমস্কার).",
        "hi-IN": "Respond strictly in fluent, natural Hindi (हिंदी). Use respectful terms (e.g., आप, नमस्ते).",
        "en-IN": "Respond in warm, professional, clear English. You may use traditional greetings like 'Namaste'.",
    }.get(language, "Respond in warm, clear English.")

    system_prompt = f"""
You are the official "KarigarSetu AI Assistant" for KarigarSetu — India's verified artisan marketplace and digital craft studio.

CORE PURPOSE:
- Help customers explore authentic Indian handicrafts, understand craft heritage, find products, check stock/dimensions/prices, understand the custom request workflow, track their own orders, and message artisans.
- Help artisans navigate their Artisan Studio dashboard, understand the AI price suggestion formula (living wage + materials + craft intricacy), manage product listings, and answer custom product requests.

BEHAVIORAL RULES:
1. STRICTLY ADVISORY & READ-ONLY: You CANNOT modify data, place orders, delete items, change prices, approve products, or ban accounts. Guide users to the correct buttons/pages if they wish to perform actions.
2. ACCURACY & NO HALLUCINATIONS: Only mention products, orders, artisans, prices, and stock that exist in the live context below or generally exist in KarigarSetu. If specific data is not available, state politely that it is unavailable.
3. PRIVACY: Never reveal sensitive database internals, password hashes, or another user's private data.
4. TONE & CONCISENESS: Be warm, respectful, culturally appreciative of Indian artisans, and concise (usually 2 to 4 sentences or a neat bulleted list).
5. LANGUAGE REQUIREMENT: {lang_instructions}

LIVE APP & USER CONTEXT:
- User Role: {context_data['role']} (User ID: {user_id or 'Guest'})
- Current Page Route: {context_data['current_route']}
- Active Product Context: {json.dumps(context_data['current_product'], ensure_ascii=False) if context_data['current_product'] else 'None'}
- Active Artisan Context: {json.dumps(context_data['current_artisan'], ensure_ascii=False) if context_data['current_artisan'] else 'None'}
- Approved Marketplace Crafts Sample: {json.dumps(context_data['products_summary'][:8], ensure_ascii=False)}
- Customer Orders (if logged in): {json.dumps(context_data['customer_orders_summary'], ensure_ascii=False)}
- Customer Custom Requests (if logged in): {json.dumps(context_data['customer_custom_requests'], ensure_ascii=False)}
- Artisan Own Listings (if logged in): {json.dumps(context_data['artisan_products_summary'], ensure_ascii=False)}
- Artisan Custom Requests (if logged in): {json.dumps(context_data['artisan_custom_requests'], ensure_ascii=False)}
""".strip()

    if not GEMINI_API_KEY:
        # Graceful fallback without failing or crashing
        reply = generate_fallback_ai_reply(message, language, user_role, context_data)
        return jsonify({
            "success": True,
            "reply": reply,
            "source": "smart_assistant_fallback",
        }), 200

    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_prompt}\n\nUser Question:\n{message}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 600,
        },
    }
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent"
    )

    try:
        response = requests.post(
            endpoint,
            headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
            json=request_body,
            timeout=(5, 20),
        )
        if response.ok:
            result_json = response.json()
            candidates = result_json.get("candidates") or []
            if candidates:
                parts = candidates[0].get("content", {}).get("parts") or []
                if parts and "text" in parts[0]:
                    reply_text = parts[0]["text"].strip()
                    return jsonify({
                        "success": True,
                        "reply": reply_text,
                        "source": "gemini",
                    }), 200

        # In case Gemini returns an error status code or empty reply
        app.logger.warning("Gemini AI assistant returned status %s: %s", response.status_code if response else "None", response.text if response else "")
        reply = generate_fallback_ai_reply(message, language, user_role, context_data)
        return jsonify({
            "success": True,
            "reply": reply,
            "source": "smart_assistant_fallback",
        }), 200

    except requests.RequestException as error:
        app.logger.warning("Gemini AI assistant request failed: %s", error)
        reply = generate_fallback_ai_reply(message, language, user_role, context_data)
        return jsonify({
            "success": True,
            "reply": reply,
            "source": "smart_assistant_fallback",
        }), 200


initialize_database()

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )

