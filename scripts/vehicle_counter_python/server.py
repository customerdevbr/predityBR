#!/usr/bin/env python3
"""
Vehicle Counter Backend — Python
YOLOv8n + supervision (ByteTrack + DetectionsSmoother + LineZone)

Replaces the Node.js/ONNX backend with superior tracking accuracy.
Same protocol: Supabase DB, webhook, Realtime broadcast, health :3001.
"""

import os
import sys
import time
import hmac
import hashlib
import json
import queue
import threading
import subprocess
import logging
import requests
import numpy as np
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client
from ultralytics import YOLO
import supervision as sv

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

# Suppress ultralytics / supervision noise
logging.getLogger('ultralytics').setLevel(logging.WARNING)

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
PREDITY_API_URL      = os.getenv('PREDITY_API_URL', 'http://localhost:3000')
WEBHOOK_SECRET       = os.getenv('PREDITY_WEBHOOK_SECRET', '')
BROADCAST_SECRET     = os.getenv('BROADCAST_HMAC_SECRET') or WEBHOOK_SECRET

ROUND_DURATION_S  = 5 * 60       # 5 minutes
BETWEEN_ROUNDS_S  = 12           # 12 s between rounds
SYNC_INTERVAL_S   = 5            # DB sync every 5 s
DETECT_FPS        = 1.5          # FFmpeg output FPS
INPUT_SIZE        = 640
FRAME_SIZE        = INPUT_SIZE * INPUT_SIZE * 3  # RGB24 bytes per frame

HLS_STREAM        = 'https://34.104.32.249.nip.io/SP055-KM136/stream.m3u8'
MODEL_NAME        = 'yolov8n.pt'
VEHICLE_CLASSES   = [2, 3, 5, 7]   # COCO: car, motorcycle, bus, truck
CONF_THRESHOLD    = 0.30

# Detection zone — restrict IA to the road band around the counting line
ZONE_Y_MIN_PX = int(0.30 * INPUT_SIZE)  # 192 px
ZONE_Y_MAX_PX = int(0.70 * INPUT_SIZE)  # 448 px

# Counting line — horizontal at mid-frame
LINE_START = sv.Point(int(0.15 * INPUT_SIZE), int(0.50 * INPUT_SIZE))  # (96, 320)
LINE_END   = sv.Point(int(0.85 * INPUT_SIZE), int(0.50 * INPUT_SIZE))  # (544, 320)

# ── Supabase client ───────────────────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Vision objects (re-created each round) ────────────────────────────────────
model: Optional[YOLO]                     = None
tracker:   Optional[sv.ByteTrack]         = None
smoother:  Optional[sv.DetectionsSmoother] = None
line_zone: Optional[sv.LineZone]          = None

# ── Global state ──────────────────────────────────────────────────────────────
state_lock = threading.Lock()

current_round:    Optional[dict] = None
detector_active:  bool           = False
crossings:        int            = 0
current_boxes:    list           = []

ffmpeg_proc:      Optional[subprocess.Popen] = None
ffmpeg_stopping:  bool = False

last_broadcast_count: int   = -1
last_broadcast_time:  float = 0.0

# Frame queue: inference worker reads from here (drop frames when full)
frame_queue: queue.Queue = queue.Queue(maxsize=1)

# Timers
sync_timer:      Optional[threading.Timer] = None
round_end_timer: Optional[threading.Timer] = None


# ── HMAC helpers ──────────────────────────────────────────────────────────────
def _sign(key: str, data: str) -> str:
    return hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()


def sign_payload(payload: dict) -> str:
    """Match JS: JSON.stringify(payload) with compact separators."""
    return _sign(BROADCAST_SECRET, json.dumps(payload, separators=(',', ':')))


def sign_webhook(body: str) -> str:
    return _sign(WEBHOOK_SECRET, body)


# ── Webhook ───────────────────────────────────────────────────────────────────
def send_webhook(action: str, round_id: str, extra: dict = {}):
    url  = f'{PREDITY_API_URL}/api/webhook/vehicle-round'
    body = json.dumps({'action': action, 'round_id': round_id, **extra})
    sig  = sign_webhook(body)
    ts   = str(int(time.time() * 1000))
    try:
        r = requests.post(url, data=body, headers={
            'Content-Type':        'application/json',
            'x-webhook-secret':    WEBHOOK_SECRET,
            'x-webhook-signature': sig,
            'x-webhook-timestamp': ts,
        }, timeout=10)
        log.info(f'[Webhook] {action} → {r.status_code}')
    except Exception as e:
        log.error(f'[Webhook] Falha: {e}')


# ── Supabase Realtime Broadcast (REST API) ────────────────────────────────────
def broadcast_boxes():
    global last_broadcast_count, last_broadcast_time

    now = time.time()
    if crossings == last_broadcast_count and now - last_broadcast_time < 2.0:
        return
    if not current_round:
        return

    last_broadcast_count = crossings
    last_broadcast_time  = now

    payload = {
        'boxes': current_boxes,
        'count': crossings,
        'ts':    int(now * 1000),
    }
    payload['sig'] = sign_payload({'boxes': payload['boxes'], 'count': payload['count'], 'ts': payload['ts']})

    try:
        r = requests.post(
            f'{SUPABASE_URL}/realtime/v1/api/broadcast',
            json={
                'messages': [{
                    'topic': f'realtime:det-{current_round["id"]}',
                    'event': 'broadcast',
                    'payload': {
                        'type':    'broadcast',
                        'event':   'det',
                        'payload': payload,
                    },
                }]
            },
            headers={
                'apikey':        SUPABASE_SERVICE_KEY,
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'Content-Type':  'application/json',
            },
            timeout=3,
        )
        if r.status_code >= 400:
            log.warning(f'[Broadcast] HTTP {r.status_code}: {r.text[:120]}')
    except Exception as e:
        log.warning(f'[Broadcast] Erro: {e}')


# ── Frame processing (called from inference worker) ──────────────────────────
def process_frame(rgb_bytes: bytes):
    global crossings, current_boxes

    if not detector_active or not model:
        return

    # Decode raw RGB24 → numpy HWC array
    frame = np.frombuffer(rgb_bytes, dtype=np.uint8).reshape((INPUT_SIZE, INPUT_SIZE, 3))

    # YOLO inference
    results = model.predict(
        frame,
        classes=VEHICLE_CLASSES,
        conf=CONF_THRESHOLD,
        iou=0.45,
        verbose=False,
        device='cpu',
    )[0]

    detections = sv.Detections.from_ultralytics(results)

    # Restrict to detection zone (road band)
    if len(detections) > 0:
        cy_px = (detections.xyxy[:, 1] + detections.xyxy[:, 3]) / 2
        mask  = (cy_px >= ZONE_Y_MIN_PX) & (cy_px <= ZONE_Y_MAX_PX)
        detections = detections[mask]

    # Track → smooth → count
    detections = tracker.update_with_detections(detections)
    detections = smoother.update_with_detections(detections)
    line_zone.trigger(detections=detections)

    new_crossings = line_zone.in_count + line_zone.out_count
    if new_crossings != crossings:
        log.info(f'[Det] Cruzamento → {new_crossings} total')
        crossings = new_crossings

    # Build normalized box list for broadcast
    boxes = []
    if len(detections) > 0 and detections.tracker_id is not None:
        for i in range(len(detections)):
            x1, y1, x2, y2 = detections.xyxy[i]
            boxes.append({
                'id': int(detections.tracker_id[i]),
                'cx': round(float((x1 + x2) / 2 / INPUT_SIZE), 3),
                'cy': round(float((y1 + y2) / 2 / INPUT_SIZE), 3),
                'w':  round(float((x2 - x1) / INPUT_SIZE), 3),
                'h':  round(float((y2 - y1) / INPUT_SIZE), 3),
            })
    current_boxes = boxes

    broadcast_boxes()


# ── Inference worker thread ───────────────────────────────────────────────────
def inference_worker():
    """Persistent thread that processes frames from frame_queue."""
    log.info('[Inference] Worker iniciado.')
    while True:
        try:
            frame_data = frame_queue.get(timeout=1.0)
        except queue.Empty:
            continue
        if frame_data is None:  # shutdown signal
            break
        try:
            process_frame(frame_data)
        except Exception as e:
            log.error(f'[Inference] Erro: {e}')


# ── FFmpeg pipeline ───────────────────────────────────────────────────────────
def _ffmpeg_reader(proc: subprocess.Popen):
    """Reads raw frames from FFmpeg and enqueues them for inference."""
    global ffmpeg_proc, ffmpeg_stopping, detector_active, current_round

    buf = bytearray()
    try:
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            buf.extend(chunk)
            while len(buf) >= FRAME_SIZE:
                if detector_active:
                    try:
                        frame_queue.put_nowait(bytes(buf[:FRAME_SIZE]))
                    except queue.Full:
                        pass  # drop frame — inference is too slow
                del buf[:FRAME_SIZE]
    except Exception as e:
        log.error(f'[FFmpeg] Reader error: {e}')

    proc.wait()
    code = proc.returncode

    with state_lock:
        stopping = ffmpeg_stopping

    if stopping:
        log.info('[FFmpeg] Pipeline parado intencionalmente.')
        return

    log.info(f'[FFmpeg] Encerrado (code={code})')

    # Stream lost during an active round → void market
    if detector_active and current_round:
        log.warning('[FFmpeg] Stream perdida — cancelando rodada...')
        rid = current_round['id']
        threading.Thread(target=_cancel_round_stream_failure, args=(rid,), daemon=True).start()
        return

    # Transient failure → reconnect after 5 s
    if detector_active:
        log.info('[FFmpeg] Reconectando em 5 s...')
        time.sleep(5)
        start_pipeline()


def start_pipeline():
    global ffmpeg_proc, ffmpeg_stopping

    if ffmpeg_proc and ffmpeg_proc.poll() is None:
        return  # already running

    with state_lock:
        ffmpeg_stopping = False

    log.info(f'[FFmpeg] Iniciando pipeline ({DETECT_FPS} fps)...')
    proc = subprocess.Popen(
        [
            'ffmpeg', '-y',
            '-tls_verify', '0',
            '-probesize', '500000',
            '-analyzeduration', '1000000',
            '-live_start_index', '-1',
            '-i', HLS_STREAM,
            '-vf', f'fps={DETECT_FPS},scale={INPUT_SIZE}:{INPUT_SIZE}',
            '-f', 'rawvideo',
            '-pix_fmt', 'rgb24',
            'pipe:1',
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=0,
    )
    ffmpeg_proc = proc
    t = threading.Thread(target=_ffmpeg_reader, args=(proc,), daemon=True)
    t.start()


def stop_pipeline():
    global ffmpeg_proc, ffmpeg_stopping

    proc = ffmpeg_proc
    if not proc or proc.poll() is not None:
        return

    with state_lock:
        ffmpeg_stopping = True

    proc.terminate()
    ffmpeg_proc = None


# ── DB helpers ────────────────────────────────────────────────────────────────
def sync_count(round_id: str):
    try:
        supabase.table('rounds').update({'actual_count': crossings}).eq('id', round_id).execute()
    except Exception as e:
        log.error(f'[DB] sync_count error: {e}')


def get_target_count() -> int:
    try:
        res = (
            supabase.table('rounds')
            .select('actual_count')
            .eq('status', 'finished')
            .gt('actual_count', 10)
            .order('end_time', desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return int(res.data[0]['actual_count'])
    except Exception as e:
        log.error(f'[DB] get_target_count error: {e}')
    return 100


def cleanup_orphan_rounds():
    try:
        res = supabase.table('rounds').select('id, actual_count').eq('status', 'active').execute()
        if not res.data:
            return
        log.info(f'[Cleanup] Fechando {len(res.data)} rodada(s) órfã(s)...')
        for r in res.data:
            count = int(r.get('actual_count') or 0)
            supabase.table('rounds').update({'status': 'finished', 'actual_count': count}).eq('id', r['id']).execute()
            send_webhook('end', r['id'], {
                'actual_count':  count,
                'rounded_count': ((count + 9) // 10) * 10,
            })
    except Exception as e:
        log.error(f'[Cleanup] Error: {e}')


# ── Round tracker reset ───────────────────────────────────────────────────────
def _reset_vision():
    global tracker, smoother, line_zone
    tracker   = sv.ByteTrack(
        track_activation_threshold=0.25,
        lost_track_buffer=10,
        minimum_matching_threshold=0.8,
        frame_rate=max(1, round(DETECT_FPS)),
        minimum_consecutive_frames=1,
    )
    smoother  = sv.DetectionsSmoother()
    # Use CENTER anchor to match the old backend's (cx, cy) line-crossing check
    line_zone = sv.LineZone(
        start=LINE_START,
        end=LINE_END,
        triggering_anchors=[sv.Position.CENTER],
    )


# ── Sync loop ─────────────────────────────────────────────────────────────────
def _sync_loop(round_id: str):
    global sync_timer
    if not detector_active or not current_round or current_round['id'] != round_id:
        return
    sync_count(round_id)
    sync_timer = threading.Timer(SYNC_INTERVAL_S, _sync_loop, args=[round_id])
    sync_timer.daemon = True
    sync_timer.start()


# ── Finish round ──────────────────────────────────────────────────────────────
def finish_round(round_row: dict):
    global detector_active, current_round, crossings, current_boxes
    global sync_timer, round_end_timer

    _cancel_timers()
    detector_active = False
    stop_pipeline()

    round_id = round_row['id']
    sync_count(round_id)

    try:
        supabase.table('rounds').update({'status': 'finished', 'actual_count': crossings}).eq('id', round_id).execute()
    except Exception as e:
        log.error(f'[Rodada] finish update error: {e}')

    rounded = ((crossings + 9) // 10) * 10
    log.info(f'[Rodada] Encerrada: {round_id} | Final: {crossings} | Arredondado: {rounded}')
    send_webhook('end', round_id, {'actual_count': crossings, 'rounded_count': rounded})

    current_round = None
    current_boxes = []
    _reset_vision()

    log.info(f'[Rodada] Próxima em {BETWEEN_ROUNDS_S} s...')
    _schedule(BETWEEN_ROUNDS_S, start_round)


def _cancel_round_stream_failure(round_id: str):
    global detector_active, current_round, current_boxes

    _cancel_timers()
    detector_active = False

    try:
        supabase.table('rounds').update({'status': 'finished', 'actual_count': crossings}).eq('id', round_id).execute()
        send_webhook('void', round_id, {'reason': 'stream_failure', 'actual_count': crossings})
    except Exception as e:
        log.error(f'[Cancel] Error: {e}')

    current_round = None
    current_boxes = []
    _reset_vision()

    log.info('[Rodada] Reagendando após falha de stream (60 s)...')
    _schedule(60, start_round)


def _cancel_timers():
    global sync_timer, round_end_timer
    if sync_timer:
        sync_timer.cancel()
        sync_timer = None
    if round_end_timer:
        round_end_timer.cancel()
        round_end_timer = None


def _schedule(delay: float, fn, args=()):
    t = threading.Timer(delay, fn, args=args)
    t.daemon = True
    t.start()
    return t


# ── Start round ───────────────────────────────────────────────────────────────
def start_round():
    global detector_active, current_round, crossings, current_boxes
    global sync_timer, round_end_timer, last_broadcast_count, last_broadcast_time

    if detector_active:
        return

    if not is_operating_hours():
        log.info(f'[Rodada] Fora do horário ({get_brt_hour()}h BRT). Verificando em 1 min...')
        _schedule(60, start_round)
        return

    if not check_stream_accessible():
        log.warning('[Rodada] Stream inacessível. Tentando em 30 s...')
        _schedule(30, start_round)
        return

    target_count = get_target_count()
    now_utc      = datetime.now(timezone.utc)
    start_iso    = now_utc.isoformat()
    end_iso      = (now_utc + timedelta(seconds=ROUND_DURATION_S)).isoformat()

    try:
        res = supabase.table('rounds').insert({
            'start_time':   start_iso,
            'end_time':     end_iso,
            'status':       'active',
            'actual_count': 0,
            'target_count': target_count,
        }).execute()
        row = res.data[0] if res.data else None
    except Exception as e:
        log.error(f'[Rodada] Erro ao criar: {e}')
        _schedule(5, start_round)
        return

    if not row:
        log.error('[Rodada] Insert retornou vazio.')
        _schedule(5, start_round)
        return

    current_round         = row
    crossings             = 0
    current_boxes         = []
    detector_active       = True
    last_broadcast_count  = -1
    last_broadcast_time   = 0.0
    _reset_vision()

    log.info(f'[Rodada] Iniciada: {row["id"]} | Meta: {target_count}')
    send_webhook('start', row['id'], {'target_count': target_count, 'end_time': end_iso})

    start_pipeline()
    _sync_loop(row['id'])

    round_end_timer = _schedule(ROUND_DURATION_S, finish_round, args=(row,))


# ── Timezone / stream helpers ─────────────────────────────────────────────────
def get_brt_hour() -> int:
    return (datetime.now(timezone.utc) - timedelta(hours=3)).hour


def is_operating_hours() -> bool:
    return 9 <= get_brt_hour() < 20


def check_stream_accessible() -> bool:
    try:
        import urllib3
        urllib3.disable_warnings()
        r = requests.head(HLS_STREAM, verify=False, timeout=5, allow_redirects=True)
        return 200 <= r.status_code < 400
    except Exception:
        return False


# ── Health-check HTTP server ──────────────────────────────────────────────────
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        data = json.dumps({
            'ok':       True,
            'round':    current_round['id'] if current_round else None,
            'crossings': crossings,
            'tracks':   len(current_boxes),
            'active':   detector_active,
            'ffmpeg':   bool(ffmpeg_proc and ffmpeg_proc.poll() is None),
        }).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass  # suppress access logs


def run_health_server():
    server = HTTPServer(('0.0.0.0', 3001), HealthHandler)
    log.info('[HTTP] Health-check em :3001')
    server.serve_forever()


# ── Bootstrap ─────────────────────────────────────────────────────────────────
def main():
    global model

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error('[Boot] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
        sys.exit(1)

    log.info('[Boot] Iniciando vehicle counter (Python / YOLOv8 + ByteTrack)...')

    # Load model
    log.info(f'[Boot] Carregando {MODEL_NAME}...')
    model = YOLO(MODEL_NAME)
    # Warm-up run to JIT-compile
    dummy = np.zeros((INPUT_SIZE, INPUT_SIZE, 3), dtype=np.uint8)
    model.predict(dummy, verbose=False, device='cpu')
    log.info('[Boot] Modelo pronto.')

    # Cleanup stale rounds from previous crash
    cleanup_orphan_rounds()

    # Start inference worker
    t = threading.Thread(target=inference_worker, daemon=True, name='inference')
    t.start()

    # Start health server
    t2 = threading.Thread(target=run_health_server, daemon=True, name='health')
    t2.start()

    # First round in 5 s
    log.info('[Boot] Primeira rodada em 5 s...')
    _schedule(5, start_round)

    # Keep main thread alive
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        log.info('[Boot] Encerrando...')
        frame_queue.put(None)   # stop inference worker
        stop_pipeline()


if __name__ == '__main__':
    main()
