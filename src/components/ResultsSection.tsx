"""
RAYOCERO — TELEMETRY MIDDLEWARE V3.0
Hardware: Impinj J-REV (2 puertos)
CEO: Lualdo Sciscioli | Valkyron Group

CAMBIOS V3.0:
─ Sin retry loop — sllurp maneja su propio ciclo de vida
─ SQLite local para backup de tiempos (no depende de red)
─ Supabase sync asíncrono en hilo separado
─ Debounce 0.5s para carreras con múltiples atletas simultáneos
"""

import logging
import os
import time
import threading
import sqlite3
from datetime import datetime, timezone
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from sllurp.llrp import LLRPReaderConfig, LLRPReaderClient
from supabase import create_client, Client

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("rayocero_telemetry")

# ── Config ───────────────────────────────────────────────────────
READER_HOST          = os.getenv("READER_HOST", "169.254.19.72")
READER_PORT          = int(os.getenv("READER_PORT", "5084"))
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_KEY         = os.getenv("SUPABASE_KEY")
ANTENNA_START_FINISH = 1
ANTENNA_CONTROL      = 2
TX_POWER             = 30
TAG_POPULATION       = 500
DEBOUNCE_SECS        = 0.5

# ── SQLite local ─────────────────────────────────────────────────
DB_PATH = "rayocero_local.db"

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            epc TEXT,
            bib_number INTEGER,
            nombre TEXT,
            tipo TEXT,
            antenna INTEGER,
            timestamp_utc TEXT,
            elapsed_seconds REAL,
            synced INTEGER DEFAULT 0
        )
    """)
    con.commit()
    con.close()
    log.info(f"✅ SQLite local: {DB_PATH}")

def db_insert(epc, bib, nombre, tipo, antenna, timestamp_utc, elapsed_secs=None):
    try:
        con = sqlite3.connect(DB_PATH)
        con.execute(
            "INSERT INTO eventos (epc,bib_number,nombre,tipo,antenna,timestamp_utc,elapsed_seconds) VALUES (?,?,?,?,?,?,?)",
            (epc, bib, nombre, tipo, antenna, timestamp_utc, elapsed_secs)
        )
        con.commit()
        con.close()
    except Exception as e:
        log.error(f"SQLite error: {e}")

# ── Estado global ─────────────────────────────────────────────────
class RaceState:
    def __init__(self):
        self.race_started      = False
        self.race_start_time: Optional[datetime] = None
        self.last_seen: dict   = defaultdict(float)
        self.runner_state: dict = defaultdict(lambda: 'waiting')
        self.epc_cache: dict   = {}
        self.sse_clients: list = []
        self.results: list     = []
        self.demo_mode         = False

state = RaceState()

# ── Supabase ─────────────────────────────────────────────────────
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("✅ Supabase conectado")
else:
    log.warning("⚠️  Sin credenciales Supabase — modo demo")
    state.demo_mode = True

# ── Helpers ──────────────────────────────────────────────────────
def get_epc(tag: dict) -> str:
    raw = tag.get("EPC-96") or tag.get("EPC") or b""
    if not isinstance(raw, bytes):
        return str(raw).upper()
    try:
        decoded = raw.decode('ascii')
        if decoded.isprintable() and len(decoded) > 4:
            return decoded.strip().upper()
    except (UnicodeDecodeError, ValueError):
        pass
    return raw.hex().upper()

def get_antenna(tag: dict) -> int:
    return tag.get("AntennaID", 1)

def elapsed_str(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:05.2f}"
    return f"{m:02d}:{s:05.2f}"

def broadcast_sync(event: dict):
    import json
    msg = json.dumps(event)
    for q in list(state.sse_clients):
        try:
            q.put_nowait(msg)
        except Exception:
            pass

# ── Cache EPCs ────────────────────────────────────────────────────
_unknown_epcs: set = set()

def get_runner_by_epc(epc: str) -> Optional[dict]:
    if epc in state.epc_cache:
        return state.epc_cache[epc]
    if epc in _unknown_epcs:
        return None
    if not supabase:
        return None
    try:
        res = supabase.table("runners").select(
            "id, bib_number, nombre, apellido, categoria, genero, rfid_epc, race_status"
        ).eq("rfid_epc", epc).execute()
        if res.data and len(res.data) > 0:
            state.epc_cache[epc] = res.data[0]
            log.info(f"✅ EPC: {epc} → BIB #{res.data[0]['bib_number']} {res.data[0]['nombre']}")
            return res.data[0]
        else:
            _unknown_epcs.add(epc)
            return None
    except Exception as e:
        log.error(f"Error buscando EPC {epc}: {e}")
    return None

# ── Supabase async update ─────────────────────────────────────────
def supabase_update_async(bib: int, data: dict):
    """Actualizar Supabase en hilo separado para no bloquear el callback LLRP."""
    def _update():
        try:
            supabase.table("runners").update(data).eq("bib_number", bib).execute()
            state.epc_cache = {k: v for k, v in state.epc_cache.items() if v.get('bib_number') != bib}
        except Exception as e:
            log.error(f"Error Supabase update BIB #{bib}: {e}")
    threading.Thread(target=_update, daemon=True).start()

# ── Lógica principal ──────────────────────────────────────────────
def process_tag(epc: str, antenna: int):
    now = time.time()
    if now - state.last_seen[epc] < DEBOUNCE_SECS:
        return
    state.last_seen[epc] = now

    runner = get_runner_by_epc(epc)
    if not runner:
        return

    bib       = runner["bib_number"]
    nombre    = f"{runner['nombre']} {runner['apellido']}"
    categoria = runner.get("categoria", "---")
    runner_st = state.runner_state[epc]
    ts_utc    = datetime.now(timezone.utc).isoformat()

    log.info(f"📡 Antena {antenna} | BIB #{bib} | {nombre} | Estado: {runner_st}")

    # ── ANTENA 1: Salida / Meta ───────────────────────────────────
    if antenna == ANTENNA_START_FINISH:

        if runner_st == 'waiting' and state.race_started:
            # SALIDA
            state.runner_state[epc] = 'started'
            log.info(f"🚀 SALIDA: BIB #{bib} — {nombre}")
            db_insert(epc, bib, nombre, 'start', antenna, ts_utc)
            supabase_update_async(bib, {
                "race_status": "in_progress",
                "start_time":  ts_utc,
            })
            broadcast_sync({"type": "start", "bib": bib, "nombre": nombre, "categoria": categoria, "time": ts_utc})

        elif runner_st in ('started', 'control'):
            # META
            if not state.race_start_time:
                return
            finish_dt    = datetime.now(timezone.utc)
            elapsed_secs = (finish_dt - state.race_start_time).total_seconds()
            state.runner_state[epc] = 'finished'
            log.info(f"🏁 META: BIB #{bib} — {nombre} — {elapsed_str(elapsed_secs)}")

            db_insert(epc, bib, nombre, 'finish', antenna, finish_dt.isoformat(), elapsed_secs)
            supabase_update_async(bib, {
                "race_status":         "completed",
                "finish_time":         finish_dt.isoformat(),
                "finish_time_seconds": round(elapsed_secs, 2),
            })

            result = {
                "position":            len(state.results) + 1,
                "bib_number":          bib,
                "nombre":              runner["nombre"],
                "apellido":            runner["apellido"],
                "categoria":           categoria,
                "genero":              runner.get("genero", "---"),
                "finish_time_seconds": round(elapsed_secs, 2),
                "finish_time_str":     elapsed_str(elapsed_secs),
            }
            state.results.append(result)
            state.results.sort(key=lambda r: r["finish_time_seconds"])
            for i, r in enumerate(state.results):
                r["position"] = i + 1

            broadcast_sync({"type": "finish", "bib": bib, "nombre": nombre, "categoria": categoria,
                            "elapsed_str": elapsed_str(elapsed_secs), "elapsed_seconds": round(elapsed_secs, 2)})

    # ── ANTENA 2: Control ─────────────────────────────────────────
    elif antenna == ANTENNA_CONTROL:
        if runner_st != 'started' or not state.race_start_time:
            return
        control_dt  = datetime.now(timezone.utc)
        split_secs  = (control_dt - state.race_start_time).total_seconds()
        state.runner_state[epc] = 'control'
        log.info(f"📍 CONTROL: BIB #{bib} — {nombre} — {elapsed_str(split_secs)}")

        db_insert(epc, bib, nombre, 'control', antenna, control_dt.isoformat(), split_secs)
        supabase_update_async(bib, {
            "split_time":         control_dt.isoformat(),
            "split_time_seconds": round(split_secs, 2),
        })
        broadcast_sync({"type": "control", "bib": bib, "nombre": nombre, "split_str": elapsed_str(split_secs)})

# ── Callback LLRP ─────────────────────────────────────────────────
def tag_report_callback(reader, tag_list):
    if not tag_list:
        return
    for tag in tag_list:
        epc     = get_epc(tag)
        antenna = get_antenna(tag)
        if epc:
            process_tag(epc, antenna)

# ── LLRP Reader ───────────────────────────────────────────────────
llrp_connected = False

def connect_reader():
    global llrp_connected
    config = LLRPReaderConfig({
        "antennas":            [ANTENNA_START_FINISH, ANTENNA_CONTROL],
        "tx_power":            TX_POWER,
        "reset_on_connect":    True,
        "start_inventory":     True,
        "tag_population":      TAG_POPULATION,
        "mode_identifier":     1000,
        "report_every_n_tags": 1,
    })
    try:
        reader = LLRPReaderClient(READER_HOST, READER_PORT, config)
        reader.add_tag_report_callback(tag_report_callback)
        reader.connect()  # Bloqueante — conecta y arranca inventory
        llrp_connected = True
        log.info(f"✅ LLRP conectado a {READER_HOST}:{READER_PORT}")
    except Exception as e:
        llrp_connected = False
        log.error(f"❌ Error LLRP: {e}")

# ── FastAPI ───────────────────────────────────────────────────────
app = FastAPI(title="RayoCero Telemetry V3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/status")
def get_status():
    return {
        "llrp_connected":    llrp_connected,
        "reader_host":       READER_HOST,
        "antennas":          [ANTENNA_START_FINISH, ANTENNA_CONTROL],
        "runners_with_chip": len(state.epc_cache),
        "race_started":      state.race_started,
        "race_start_time":   state.race_start_time.isoformat() if state.race_start_time else None,
        "demo_mode":         state.demo_mode,
        "results_count":     len(state.results),
    }

@app.post("/race/start")
def start_race():
    state.race_started    = True
    state.race_start_time = datetime.now(timezone.utc)
    if supabase:
        threading.Thread(target=lambda: supabase.table("runners").update({
            "start_time": state.race_start_time.isoformat()
        }).eq("race_status", "waiting").execute(), daemon=True).start()
    broadcast_sync({"type": "race_start", "time": state.race_start_time.isoformat()})
    log.info(f"🏁 PISTOLA: {state.race_start_time.isoformat()}")
    return {"ok": True, "start_time": state.race_start_time.isoformat()}

@app.post("/race/reset")
def reset_race():
    state.race_started = False
    state.race_start_time = None
    state.last_seen.clear()
    state.runner_state.clear()
    state.epc_cache.clear()
    state.results.clear()
    _unknown_epcs.clear()
    log.info("🔄 Carrera reseteada")
    return {"ok": True}

@app.get("/results")
def get_results():
    return state.results

@app.get("/local-results")
def get_local_results():
    """Resultados desde SQLite local — funciona sin Supabase."""
    try:
        con = sqlite3.connect(DB_PATH)
        rows = con.execute(
            "SELECT bib_number, nombre, tipo, antenna, timestamp_utc, elapsed_seconds FROM eventos ORDER BY timestamp_utc"
        ).fetchall()
        con.close()
        return [{"bib": r[0], "nombre": r[1], "tipo": r[2], "antenna": r[3], "time": r[4], "elapsed": r[5]} for r in rows]
    except Exception as e:
        return {"error": str(e)}

@app.get("/live")
async def live_events():
    import asyncio, json
    queue = asyncio.Queue()
    state.sse_clients.append(queue)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        except Exception:
            pass
        finally:
            if queue in state.sse_clients:
                state.sse_clients.remove(queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

def preload_epc_cache():
    """Carga todos los runners con rfid_epc en memoria — una sola query al inicio."""
    if not supabase:
        return
    try:
        res = supabase.table("runners").select(
            "id, bib_number, nombre, apellido, categoria, genero, rfid_epc, race_status"
        ).not_.is_("rfid_epc", "null").execute()
        if res.data:
            for runner in res.data:
                epc = runner.get("rfid_epc", "").strip().upper()
                if epc:
                    state.epc_cache[epc] = runner
            log.info(f"✅ Cache precargado: {len(state.epc_cache)} chips registrados")
        else:
            log.warning("⚠️  No hay chips registrados en Supabase")
    except Exception as e:
        log.error(f"Error precargando cache: {e}")

@app.on_event("startup")
def startup():
    init_db()
    log.info("⚡ RayoCero Telemetry V3.0 arrancando...")
    preload_epc_cache()
    threading.Thread(target=connect_reader, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090, log_level="info")