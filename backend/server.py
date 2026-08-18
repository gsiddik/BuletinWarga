from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
logger = logging.getLogger(__name__)

FEATURES = [
    {"key": "rw", "label": "Master Data RW"},
    {"key": "rt", "label": "Master Data RT"},
    {"key": "role", "label": "Role & Permission"},
    {"key": "warga", "label": "Master Data Warga"},
    {"key": "pengurus", "label": "Master Data Pengurus"},
    {"key": "kategori", "label": "Master Data Kategori Laporan"},
    {"key": "laporan", "label": "Pengaduan & Aspirasi"},
]
ACTIONS = ["create", "read", "update", "delete", "toggle", "moderate"]

DEFAULT_CATEGORIES = [
    "Undangan", "Fasilitas Umum", "Pengelolaan Sampah",
    "Penghijauan & Kebersihan Saluran", "Pindah Domisili", "Kelahiran",
    "Kematian", "Tamu Asing/Pendatang baru", "Kejadian Kriminalitas",
    "Perselisihan antarwarga", "Gangguan Kebisingan",
    "Pelanggaran aturan local/Norma Warga", "Kerusakan Fasilitas Umum",
    "Jadwal Pengangkutan Sampah", "Kendala Kebersihan", "Jadwal Kerja Bakti",
]

DEFAULT_ROLES = [
    {"name": "superadmin", "label": "Superadmin", "is_system": True, "scope": "global",
     "permissions": {f["key"]: list(ACTIONS) for f in FEATURES}},
    {"name": "admin_rw", "label": "Admin RW", "is_system": True, "scope": "rw",
     "permissions": {"rw": ["read", "update"], "rt": ["create", "read", "update", "toggle"],
                     "warga": ["create", "read", "update", "delete", "toggle"],
                     "pengurus": ["create", "read", "update"],
                     "kategori": ["read"], "laporan": ["read", "moderate"]}},
    {"name": "admin_rt", "label": "Admin RT", "is_system": True, "scope": "rt",
     "permissions": {"rt": ["read"],
                     "warga": ["create", "read", "update", "delete", "toggle"],
                     "kategori": ["read"], "laporan": ["read", "moderate"]}},
    {"name": "warga", "label": "Warga", "is_system": True, "scope": "self",
     "permissions": {"laporan": ["create", "read"]}},
]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso() -> str:
    return now_utc().isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "access", "exp": now_utc() + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail="ID tidak valid")


def clean(doc: Optional[dict], drop: List[str] = ()) -> Optional[dict]:
    if doc is None:
        return None
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for k in list(out.keys()):
        if k in drop:
            out.pop(k, None)
        elif isinstance(out[k], ObjectId):
            out[k] = str(out[k])
    return out


def mask_name(name: str) -> str:
    name = name or ""
    if len(name) <= 2:
        return name + "*" * 3
    return name[:2] + "*" * (len(name) - 2)


# ---------------- auth dependencies ----------------

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Belum login")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan login kembali")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"_id": oid(payload["sub"]), "deleted": False})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="Akun tidak aktif")
    return user


async def optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def load_permissions(user: dict) -> Dict[str, Any]:
    names = user.get("roles") or ["warga"]
    docs = await db.roles.find({"name": {"$in": names}}).to_list(100)
    perms: Dict[str, List[str]] = {}
    scope = "self"
    order = {"self": 0, "rt": 1, "rw": 2, "global": 3}
    for d in docs:
        for feat, acts in (d.get("permissions") or {}).items():
            perms[feat] = sorted(set(perms.get(feat, [])) | set(acts))
        if order.get(d.get("scope", "self"), 0) > order.get(scope, 0):
            scope = d.get("scope", "self")
    return {"permissions": perms, "scope": scope}


def can(ctx: dict, feature: str, action: str) -> bool:
    return action in (ctx["permissions"].get(feature) or [])


async def user_context(user: dict = Depends(get_current_user)) -> dict:
    ctx = await load_permissions(user)
    ctx["user"] = user
    return ctx


def require(ctx: dict, feature: str, action: str):
    if not can(ctx, feature, action):
        raise HTTPException(status_code=403, detail="Tidak memiliki izin untuk aksi ini")


def report_scope_filter(ctx: dict) -> dict:
    scope = ctx["scope"]
    u = ctx["user"]
    if scope == "global":
        return {}
    if scope == "rw":
        return {"target_rw_id": u.get("rw_id")}
    if scope == "rt":
        return {"$or": [{"target_rt_id": u.get("rt_id")},
                        {"target_rw_id": u.get("rw_id"), "target_rt_id": None}]}
    return {"user_id": str(u["_id"])}


def warga_scope_filter(ctx: dict) -> dict:
    scope = ctx["scope"]
    u = ctx["user"]
    if scope == "global":
        return {}
    if scope == "rw":
        return {"rw_id": u.get("rw_id")}
    if scope == "rt":
        return {"rt_id": u.get("rt_id")}
    return {"_id": u["_id"]}


# ---------------- models ----------------

class LoginIn(BaseModel):
    username: str
    password: str


class RWIn(BaseModel):
    name: str
    provinsi: str
    kota: str
    kecamatan: str
    kelurahan: str


class RTIn(BaseModel):
    name: str
    rw_id: str


class RoleIn(BaseModel):
    name: str
    label: str
    scope: str = "self"
    permissions: Dict[str, List[str]] = {}


class WargaIn(BaseModel):
    full_name: str
    address: str = ""
    phone: str
    email: str
    rw_id: Optional[str] = None
    rt_id: Optional[str] = None
    roles: Optional[List[str]] = None
    password: Optional[str] = None


class KategoriIn(BaseModel):
    name: str


class PengurusMember(BaseModel):
    jabatan: str
    user_id: str


class PengurusIn(BaseModel):
    level: str  # rw | rt
    rw_id: str
    rt_id: Optional[str] = None
    ketua_user_id: str
    members: List[PengurusMember] = []


class Attachment(BaseModel):
    name: str
    mime: str
    data: str


class ReportIn(BaseModel):
    type: str  # pengaduan | aspirasi
    title: str = Field(max_length=255)
    body: str = Field(max_length=3000)
    incident_date: str
    location: str = ""
    target_rw_id: str
    target_rt_id: Optional[str] = None
    category_id: str
    attachments: List[Attachment] = []
    anonim: bool = False
    rahasia: bool = False


class FollowUpIn(BaseModel):
    date: str
    description: str
    attachments: List[Attachment] = []


# ---------------- auth routes ----------------

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    ident = payload.username.strip()
    query = {"email": ident.lower()} if "@" in ident else {"phone": re.sub(r"\D", "", ident)}
    user = await db.users.find_one({**query, "deleted": False})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email/nomor telepon atau password salah")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Akun Anda tidak aktif")
    token = create_access_token(str(user["_id"]))
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")
    ctx = await load_permissions(user)
    return {"token": token, "user": clean(user, ["password_hash"]), **ctx}


@api.get("/auth/me")
async def me(ctx: dict = Depends(user_context)):
    return {"user": clean(ctx["user"], ["password_hash"]),
            "permissions": ctx["permissions"], "scope": ctx["scope"]}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ---------------- RW ----------------

@api.get("/rw")
async def list_rw(all: bool = False):
    q = {"deleted": False} if all else {"deleted": False, "active": True}
    docs = await db.rw.find(q).sort("name", 1).to_list(1000)
    return [clean(d) for d in docs]


@api.post("/rw")
async def create_rw(payload: RWIn, ctx: dict = Depends(user_context)):
    require(ctx, "rw", "create")
    if not re.fullmatch(r"\d{1,3}", payload.name):
        raise HTTPException(status_code=400, detail="Nama RW harus 1-3 digit angka")
    doc = {**payload.model_dump(), "active": True, "deleted": False, "created_at": iso()}
    res = await db.rw.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@api.put("/rw/{rw_id}")
async def update_rw(rw_id: str, payload: RWIn, ctx: dict = Depends(user_context)):
    require(ctx, "rw", "update")
    if not re.fullmatch(r"\d{1,3}", payload.name):
        raise HTTPException(status_code=400, detail="Nama RW harus 1-3 digit angka")
    if ctx["scope"] != "global" and str(ctx["user"].get("rw_id")) != rw_id:
        raise HTTPException(status_code=403, detail="Hanya dapat mengubah RW sendiri")
    await db.rw.update_one({"_id": oid(rw_id)}, {"$set": payload.model_dump()})
    return clean(await db.rw.find_one({"_id": oid(rw_id)}))


@api.patch("/rw/{rw_id}/toggle")
async def toggle_rw(rw_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "rw", "toggle")
    doc = await db.rw.find_one({"_id": oid(rw_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="RW tidak ditemukan")
    await db.rw.update_one({"_id": oid(rw_id)}, {"$set": {"active": not doc.get("active", True)}})
    return clean(await db.rw.find_one({"_id": oid(rw_id)}))


# ---------------- RT ----------------

@api.get("/rt")
async def list_rt(rw_id: Optional[str] = None, all: bool = False):
    q: dict = {"deleted": False}
    if not all:
        q["active"] = True
    if rw_id:
        q["rw_id"] = rw_id
    docs = await db.rt.find(q).sort("name", 1).to_list(2000)
    return [clean(d) for d in docs]


def assert_rw_access(ctx: dict, rw_id: str):
    if ctx["scope"] == "global":
        return
    if ctx["scope"] == "rw" and str(ctx["user"].get("rw_id")) == rw_id:
        return
    raise HTTPException(status_code=403, detail="Di luar cakupan wilayah Anda")


@api.post("/rt")
async def create_rt(payload: RTIn, ctx: dict = Depends(user_context)):
    require(ctx, "rt", "create")
    assert_rw_access(ctx, payload.rw_id)
    doc = {**payload.model_dump(), "active": True, "deleted": False, "created_at": iso()}
    res = await db.rt.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@api.put("/rt/{rt_id}")
async def update_rt(rt_id: str, payload: RTIn, ctx: dict = Depends(user_context)):
    require(ctx, "rt", "update")
    assert_rw_access(ctx, payload.rw_id)
    await db.rt.update_one({"_id": oid(rt_id)}, {"$set": payload.model_dump()})
    return clean(await db.rt.find_one({"_id": oid(rt_id)}))


@api.patch("/rt/{rt_id}/toggle")
async def toggle_rt(rt_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "rt", "toggle")
    doc = await db.rt.find_one({"_id": oid(rt_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="RT tidak ditemukan")
    assert_rw_access(ctx, doc["rw_id"])
    await db.rt.update_one({"_id": oid(rt_id)}, {"$set": {"active": not doc.get("active", True)}})
    return clean(await db.rt.find_one({"_id": oid(rt_id)}))


# ---------------- roles ----------------

@api.get("/features")
async def get_features():
    return {"features": FEATURES, "actions": ACTIONS}


@api.get("/roles")
async def list_roles():
    docs = await db.roles.find({"deleted": {"$ne": True}}).to_list(200)
    return [clean(d) for d in docs]


@api.post("/roles")
async def create_role(payload: RoleIn, ctx: dict = Depends(user_context)):
    require(ctx, "role", "create")
    name = re.sub(r"[^a-z0-9_]", "_", payload.name.strip().lower())
    if await db.roles.find_one({"name": name}):
        raise HTTPException(status_code=400, detail="Nama role sudah digunakan")
    doc = {**payload.model_dump(), "name": name, "is_system": False,
           "deleted": False, "created_at": iso()}
    res = await db.roles.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@api.put("/roles/{role_id}")
async def update_role(role_id: str, payload: RoleIn, ctx: dict = Depends(user_context)):
    require(ctx, "role", "update")
    doc = await db.roles.find_one({"_id": oid(role_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")
    if doc.get("name") == "superadmin":
        raise HTTPException(status_code=400, detail="Role Superadmin tidak dapat diubah")
    update = {"label": payload.label, "permissions": payload.permissions, "scope": payload.scope}
    await db.roles.update_one({"_id": oid(role_id)}, {"$set": update})
    return clean(await db.roles.find_one({"_id": oid(role_id)}))


@api.delete("/roles/{role_id}")
async def delete_role(role_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "role", "delete")
    doc = await db.roles.find_one({"_id": oid(role_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")
    if doc.get("is_system"):
        raise HTTPException(status_code=400, detail="Role bawaan tidak dapat dihapus")
    await db.roles.update_one({"_id": oid(role_id)}, {"$set": {"deleted": True}})
    return {"ok": True}


# ---------------- warga ----------------

async def default_password(rw_id: Optional[str], rt_id: Optional[str], full_name: str) -> str:
    rw = await db.rw.find_one({"_id": oid(rw_id)}) if rw_id else None
    rt = await db.rt.find_one({"_id": oid(rt_id)}) if rt_id else None
    count = await db.users.count_documents({}) + 1
    first = (full_name.strip().split(" ")[0] or "warga")
    return f"{(rw or {}).get('name', 'RW')}_{(rt or {}).get('name', 'RT')}_{first}_{count}"


async def enrich_users(docs: List[dict]) -> List[dict]:
    rws = {str(d["_id"]): d["name"] for d in await db.rw.find({}).to_list(1000)}
    rts = {str(d["_id"]): d["name"] for d in await db.rt.find({}).to_list(2000)}
    out = []
    for d in docs:
        c = clean(d, ["password_hash"])
        c["rw_name"] = rws.get(str(d.get("rw_id")))
        c["rt_name"] = rts.get(str(d.get("rt_id")))
        out.append(c)
    return out


@api.get("/warga")
async def list_warga(rw_id: Optional[str] = None, rt_id: Optional[str] = None,
                     ctx: dict = Depends(user_context)):
    require(ctx, "warga", "read")
    q = {"deleted": False, **warga_scope_filter(ctx)}
    if rw_id:
        q["rw_id"] = rw_id
    if rt_id:
        q["rt_id"] = rt_id
    docs = await db.users.find(q).sort("full_name", 1).to_list(2000)
    return await enrich_users(docs)


@api.post("/warga")
async def create_warga(payload: WargaIn, ctx: dict = Depends(user_context)):
    require(ctx, "warga", "create")
    u = ctx["user"]
    rw_id = payload.rw_id if ctx["scope"] == "global" else u.get("rw_id")
    rt_id = payload.rt_id if ctx["scope"] in ("global", "rw") else u.get("rt_id")
    email = payload.email.strip().lower()
    phone = re.sub(r"\D", "", payload.phone)
    if await db.users.find_one({"$or": [{"email": email}, {"phone": phone}], "deleted": False}):
        raise HTTPException(status_code=400, detail="Email atau nomor telepon sudah terdaftar")
    plain = payload.password or await default_password(rw_id, rt_id, payload.full_name)
    doc = {
        "full_name": payload.full_name, "address": payload.address,
        "phone": phone, "email": email, "rw_id": rw_id, "rt_id": rt_id,
        "roles": payload.roles or ["warga"], "password_hash": hash_password(plain),
        "default_password": plain, "active": True, "deleted": False, "created_at": iso(),
    }
    res = await db.users.insert_one(doc)
    return {**clean({**doc, "_id": res.inserted_id}, ["password_hash"]), "generated_password": plain}


@api.put("/warga/{user_id}")
async def update_warga(user_id: str, payload: WargaIn, ctx: dict = Depends(user_context)):
    require(ctx, "warga", "update")
    target = await db.users.find_one({"_id": oid(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="Warga tidak ditemukan")
    u = ctx["user"]
    update = {
        "full_name": payload.full_name, "address": payload.address,
        "phone": re.sub(r"\D", "", payload.phone), "email": payload.email.strip().lower(),
    }
    if ctx["scope"] == "global":
        update["rw_id"] = payload.rw_id
        update["rt_id"] = payload.rt_id
    elif ctx["scope"] == "rw":
        update["rw_id"] = u.get("rw_id")
        update["rt_id"] = payload.rt_id
    if payload.roles is not None:
        update["roles"] = payload.roles
    if payload.password:
        update["password_hash"] = hash_password(payload.password)
        update["default_password"] = payload.password
    await db.users.update_one({"_id": oid(user_id)}, {"$set": update})
    return clean(await db.users.find_one({"_id": oid(user_id)}), ["password_hash"])


@api.delete("/warga/{user_id}")
async def delete_warga(user_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "warga", "delete")
    await db.users.update_one({"_id": oid(user_id)}, {"$set": {"deleted": True, "active": False}})
    return {"ok": True}


@api.patch("/warga/{user_id}/toggle")
async def toggle_warga(user_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "warga", "toggle")
    doc = await db.users.find_one({"_id": oid(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Warga tidak ditemukan")
    await db.users.update_one({"_id": oid(user_id)},
                              {"$set": {"active": not doc.get("active", True)}})
    return clean(await db.users.find_one({"_id": oid(user_id)}), ["password_hash"])


# ---------------- kategori ----------------

@api.get("/kategori")
async def list_kategori(all: bool = False):
    q = {"deleted": False} if all else {"deleted": False, "active": True}
    docs = await db.categories.find(q).sort("name", 1).to_list(500)
    return [clean(d) for d in docs]


@api.post("/kategori")
async def create_kategori(payload: KategoriIn, ctx: dict = Depends(user_context)):
    require(ctx, "kategori", "create")
    doc = {"name": payload.name, "active": True, "deleted": False, "created_at": iso()}
    res = await db.categories.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@api.put("/kategori/{cat_id}")
async def update_kategori(cat_id: str, payload: KategoriIn, ctx: dict = Depends(user_context)):
    require(ctx, "kategori", "update")
    await db.categories.update_one({"_id": oid(cat_id)}, {"$set": {"name": payload.name}})
    return clean(await db.categories.find_one({"_id": oid(cat_id)}))


@api.delete("/kategori/{cat_id}")
async def delete_kategori(cat_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "kategori", "delete")
    await db.categories.update_one({"_id": oid(cat_id)}, {"$set": {"deleted": True}})
    return {"ok": True}


@api.patch("/kategori/{cat_id}/toggle")
async def toggle_kategori(cat_id: str, ctx: dict = Depends(user_context)):
    require(ctx, "kategori", "toggle")
    doc = await db.categories.find_one({"_id": oid(cat_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    await db.categories.update_one({"_id": oid(cat_id)},
                                   {"$set": {"active": not doc.get("active", True)}})
    return clean(await db.categories.find_one({"_id": oid(cat_id)}))


# ---------------- pengurus ----------------

@api.get("/pengurus")
async def list_pengurus(ctx: dict = Depends(user_context)):
    require(ctx, "pengurus", "read")
    q: dict = {"deleted": False}
    if ctx["scope"] == "rw":
        q["rw_id"] = ctx["user"].get("rw_id")
    elif ctx["scope"] == "rt":
        q["rt_id"] = ctx["user"].get("rt_id")
    docs = await db.pengurus.find(q).sort("created_at", -1).to_list(1000)
    rws = {str(d["_id"]): d["name"] for d in await db.rw.find({}).to_list(1000)}
    rts = {str(d["_id"]): d["name"] for d in await db.rt.find({}).to_list(2000)}
    users = {str(d["_id"]): d["full_name"] for d in await db.users.find({}).to_list(5000)}
    out = []
    for d in docs:
        c = clean(d)
        c["rw_name"] = rws.get(str(d.get("rw_id")))
        c["rt_name"] = rts.get(str(d.get("rt_id")))
        c["ketua_name"] = users.get(str(d.get("ketua_user_id")))
        c["members"] = [{**m, "name": users.get(str(m.get("user_id")))}
                        for m in (d.get("members") or [])]
        out.append(c)
    return out


async def apply_pengurus_roles(payload: PengurusIn):
    role = "admin_rw" if payload.level == "rw" else "admin_rt"
    ids = [payload.ketua_user_id] + [m.user_id for m in payload.members]
    for uid in ids:
        if not uid:
            continue
        await db.users.update_one({"_id": oid(uid)}, {"$addToSet": {"roles": role}})


@api.post("/pengurus")
async def create_pengurus(payload: PengurusIn, ctx: dict = Depends(user_context)):
    require(ctx, "pengurus", "create")
    assert_rw_access(ctx, payload.rw_id)
    doc = {**payload.model_dump(), "deleted": False, "created_at": iso()}
    res = await db.pengurus.insert_one(doc)
    await apply_pengurus_roles(payload)
    return clean({**doc, "_id": res.inserted_id})


@api.put("/pengurus/{pid}")
async def update_pengurus(pid: str, payload: PengurusIn, ctx: dict = Depends(user_context)):
    require(ctx, "pengurus", "update")
    assert_rw_access(ctx, payload.rw_id)
    await db.pengurus.update_one({"_id": oid(pid)}, {"$set": payload.model_dump()})
    await apply_pengurus_roles(payload)
    return clean(await db.pengurus.find_one({"_id": oid(pid)}))


# ---------------- reports ----------------

async def decorate_reports(docs: List[dict], viewer: Optional[dict],
                           can_moderate: bool, hide_identity: bool = True) -> List[dict]:
    rws = {str(d["_id"]): d["name"] for d in await db.rw.find({}).to_list(1000)}
    rts = {str(d["_id"]): d["name"] for d in await db.rt.find({}).to_list(2000)}
    cats = {str(d["_id"]): d["name"] for d in await db.categories.find({}).to_list(500)}
    viewer_id = str(viewer["_id"]) if viewer else None
    out = []
    for d in docs:
        c = clean(d, ["attachments"])
        c["attachment_count"] = len(d.get("attachments") or [])
        c["target_rw_name"] = rws.get(str(d.get("target_rw_id")))
        c["target_rt_name"] = rts.get(str(d.get("target_rt_id")))
        c["category_name"] = cats.get(str(d.get("category_id")))
        owner = viewer_id and viewer_id == str(d.get("user_id"))
        reveal = can_moderate or owner or not d.get("anonim")
        c["sender_name"] = d.get("sender_name") if reveal else mask_name(d.get("sender_name", ""))
        c["is_mine"] = bool(owner)
        out.append(c)
    return out


@api.post("/reports")
async def create_report(payload: ReportIn, user: dict = Depends(get_current_user)):
    if payload.type not in ("pengaduan", "aspirasi"):
        raise HTTPException(status_code=400, detail="Tipe laporan tidak valid")
    doc = {
        **payload.model_dump(),
        "attachments": [a.model_dump() for a in payload.attachments],
        "user_id": str(user["_id"]),
        "sender_name": user.get("full_name"),
        "sender_rw_id": user.get("rw_id"),
        "sender_rt_id": user.get("rt_id"),
        "status": "baru",
        "followup": None,
        "created_at": iso(),
    }
    res = await db.reports.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "baru"}


@api.get("/reports/public")
async def public_reports(rw_id: Optional[str] = None, rt_id: Optional[str] = None,
                        viewer: Optional[dict] = Depends(optional_user)):
    q: dict = {"rahasia": False}
    ctx = await load_permissions(viewer) if viewer else None
    if viewer and ctx and ctx["scope"] == "self":
        q["target_rw_id"] = viewer.get("rw_id")
        q["$or"] = [{"target_rt_id": viewer.get("rt_id")}, {"target_rt_id": None}]
    if rw_id:
        q["target_rw_id"] = rw_id
    if rt_id:
        q["target_rt_id"] = rt_id
    docs = await db.reports.find(q).sort("created_at", -1).to_list(300)
    return await decorate_reports(docs, viewer, False)


@api.get("/reports/mine")
async def my_reports(user: dict = Depends(get_current_user)):
    docs = await db.reports.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(300)
    return await decorate_reports(docs, user, True)


@api.get("/reports/admin")
async def admin_reports(type: Optional[str] = None, status: Optional[str] = None,
                        ctx: dict = Depends(user_context)):
    require(ctx, "laporan", "read")
    q: dict = {**report_scope_filter(ctx)}
    if type:
        q["type"] = type
    if status:
        q["status"] = status
    docs = await db.reports.find(q).sort("created_at", -1).to_list(500)
    return await decorate_reports(docs, ctx["user"], can(ctx, "laporan", "moderate"))


@api.get("/reports/stats")
async def report_stats(ctx: dict = Depends(user_context)):
    require(ctx, "laporan", "read")
    base = report_scope_filter(ctx)

    async def count(extra: dict):
        return await db.reports.count_documents({**base, **extra})

    return {
        "pengaduan_total": await count({"type": "pengaduan"}),
        "pengaduan_baru": await count({"type": "pengaduan", "status": "baru"}),
        "pengaduan_dibaca": await count({"type": "pengaduan", "status": "dibaca"}),
        "pengaduan_selesai": await count({"type": "pengaduan", "status": "selesai"}),
        "aspirasi_total": await count({"type": "aspirasi"}),
        "aspirasi_baru": await count({"type": "aspirasi", "status": "baru"}),
        "aspirasi_dibaca": await count({"type": "aspirasi", "status": "dibaca"}),
        "warga_total": await db.users.count_documents({"deleted": False, **warga_scope_filter(ctx)}),
    }


@api.get("/reports/{report_id}")
async def get_report(report_id: str, mark_read: bool = False,
                     viewer: Optional[dict] = Depends(optional_user)):
    doc = await db.reports.find_one({"_id": oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    ctx = await load_permissions(viewer) if viewer else {"permissions": {}, "scope": "self"}
    moderator = can({"permissions": ctx["permissions"]}, "laporan", "moderate") if viewer else False
    owner = viewer and str(viewer["_id"]) == str(doc.get("user_id"))
    if doc.get("rahasia") and not moderator and not owner:
        raise HTTPException(status_code=403, detail="Laporan bersifat rahasia")
    if mark_read and moderator and doc.get("status") == "baru":
        await db.reports.update_one({"_id": doc["_id"]}, {"$set": {"status": "dibaca"}})
        doc["status"] = "dibaca"
    result = (await decorate_reports([doc], viewer, moderator))[0]
    result["attachments"] = doc.get("attachments") or []
    result["followup"] = doc.get("followup")
    result["can_moderate"] = moderator
    return result


@api.post("/reports/{report_id}/followup")
async def followup(report_id: str, payload: FollowUpIn, ctx: dict = Depends(user_context)):
    require(ctx, "laporan", "moderate")
    doc = await db.reports.find_one({"_id": oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    if doc.get("type") != "pengaduan":
        raise HTTPException(status_code=400, detail="Tindaklanjut hanya untuk laporan Pengaduan")
    await db.reports.update_one({"_id": doc["_id"]}, {"$set": {
        "status": "selesai",
        "followup": {**payload.model_dump(),
                     "attachments": [a.model_dump() for a in payload.attachments],
                     "by": ctx["user"].get("full_name"), "at": iso()},
    }})
    return {"ok": True, "status": "selesai"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup():
    await db.users.create_index("email")
    await db.users.create_index("phone")
    for role in DEFAULT_ROLES:
        await db.roles.update_one({"name": role["name"]}, {"$set": role}, upsert=True)
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([
            {"name": n, "active": True, "deleted": False, "created_at": iso()}
            for n in DEFAULT_CATEGORIES
        ])
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "full_name": "Super Admin", "address": "-",
            "email": email, "phone": os.environ.get("ADMIN_PHONE", "081200000001"),
            "password_hash": hash_password(password), "roles": ["superadmin"],
            "rw_id": None, "rt_id": None, "active": True, "deleted": False,
            "created_at": iso(),
        })
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one({"_id": existing["_id"]},
                                  {"$set": {"password_hash": hash_password(password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
