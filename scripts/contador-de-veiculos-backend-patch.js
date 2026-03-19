'use strict';
require('dotenv').config();

// Node.js 18 não tem WebSocket nativo — polyfill com 'ws' para Supabase Realtime
if (!global.WebSocket) {
    try { global.WebSocket = require('ws'); } catch {}
}

const { createClient } = require('@supabase/supabase-js');
const { spawn }        = require('child_process');
const http             = require('http');
const https            = require('https');
const { URL }          = require('url');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREDITY_API_URL       = process.env.PREDITY_API_URL   ?? 'http://localhost:3000';
const PREDITY_WEBHOOK_SECRET = process.env.PREDITY_WEBHOOK_SECRET ?? '';

const ROUND_DURATION_MS  = 5 * 60 * 1000;   // 5 min
const BETWEEN_ROUNDS_MS  = 12 * 1000;        // 12s entre rodadas
const HLS_STREAM         = 'https://34.104.32.249.nip.io/SP055-KM110A/stream.m3u8';
const MODEL_PATH         = __dirname + '/yolov5nu.onnx';
const INPUT_SIZE         = 640;
const FRAME_SIZE         = INPUT_SIZE * INPUT_SIZE * 3;  // RGB24 raw
const VEHICLE_CLASSES    = new Set([2, 3, 5, 7]);        // car, moto, bus, truck
const CONF_THRESHOLD     = 0.30;
const IOU_THRESHOLD      = 0.45;
const LINE               = { x1: 0.05, y1: 0.45, x2: 0.85, y2: 0.45 };

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Estado global ─────────────────────────────────────────────────────────────
let currentRound     = null;
let detectorActive   = false;
let tracks           = [];
let crossings        = 0;
let nextTrackId      = 1;

// Broadcast
let broadcastCh      = null;
let broadcastReady   = false;

// Pipeline ffmpeg contínuo
let ffpipe           = null;
let pipelineBuffer   = Buffer.alloc(0);
let frameProcessing  = false;   // mutex: não enfileira frames

// Intervals/timers (guardados para poder cancelar)
let syncInterval     = null;
let roundTimer       = null;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function postJson(rawUrl, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(rawUrl);
        const isHttps = parsed.protocol === 'https:';
        const lib  = isHttps ? https : http;
        const data = JSON.stringify(body);
        const req  = lib.request({
            hostname: parsed.hostname,
            port:     parsed.port || (isHttps ? 443 : 80),
            path:     parsed.pathname + parsed.search,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(data),
                'x-webhook-secret': PREDITY_WEBHOOK_SECRET,
            },
        }, res => {
            let out = '';
            res.on('data', d => { out += d; });
            res.on('end', () => { try { resolve(JSON.parse(out)); } catch { resolve(out); } });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// ── Webhook ───────────────────────────────────────────────────────────────────
async function sendWebhook(action, roundId, extra = {}) {
    try {
        const result = await postJson(`${PREDITY_API_URL}/api/webhook/vehicle-round`, {
            action, round_id: roundId, ...extra,
        });
        console.log(`[Webhook] ${action} → ${JSON.stringify(result)}`);
        return result;
    } catch (err) {
        console.error(`[Webhook] Falha: ${err.message}`);
    }
}

// ── NMS ───────────────────────────────────────────────────────────────────────
function iou(a, b) {
    const xi1 = Math.max(a.x1, b.x1), yi1 = Math.max(a.y1, b.y1);
    const xi2 = Math.min(a.x2, b.x2), yi2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, xi2-xi1) * Math.max(0, yi2-yi1);
    if (!inter) return 0;
    return inter / ((a.x2-a.x1)*(a.y2-a.y1) + (b.x2-b.x1)*(b.y2-b.y1) - inter);
}
function nms(dets) {
    dets.sort((a, b) => b.score - a.score);
    const keep = [], sup = new Set();
    for (let i = 0; i < dets.length; i++) {
        if (sup.has(i)) continue;
        keep.push(dets[i]);
        for (let j = i+1; j < dets.length; j++)
            if (!sup.has(j) && iou(dets[i], dets[j]) > IOU_THRESHOLD) sup.add(j);
    }
    return keep;
}

// ── Pré-processamento: raw RGB24 → Float32Array NCHW ─────────────────────────
function preprocessRaw(rgbBuf) {
    const px = INPUT_SIZE * INPUT_SIZE;
    const f32 = new Float32Array(3 * px);
    for (let i = 0; i < px; i++) {
        f32[i]        = rgbBuf[i*3]   / 255.0;
        f32[i + px]   = rgbBuf[i*3+1] / 255.0;
        f32[i + 2*px] = rgbBuf[i*3+2] / 255.0;
    }
    return f32;
}

// ── Pós-processamento YOLOv8 [1,84,8400] → detecções ─────────────────────────
function postprocess(data) {
    const N = 8400, dets = [];
    for (let i = 0; i < N; i++) {
        let maxS = 0, maxC = -1;
        for (let c = 0; c < 80; c++) {
            const s = data[(4+c)*N+i];
            if (s > maxS) { maxS = s; maxC = c; }
        }
        if (maxS < CONF_THRESHOLD || !VEHICLE_CLASSES.has(maxC)) continue;
        const cx = data[0*N+i]/INPUT_SIZE, cy = data[1*N+i]/INPUT_SIZE;
        const w  = data[2*N+i]/INPUT_SIZE, h  = data[3*N+i]/INPUT_SIZE;
        dets.push({ cx, cy, w, h, x1:cx-w/2, y1:cy-h/2, x2:cx+w/2, y2:cy+h/2, score:maxS });
    }
    return nms(dets);
}

// ── Tracking ──────────────────────────────────────────────────────────────────
function sideOfLine(px, py) {
    const { x1, y1, x2, y2 } = LINE;
    return (x2-x1)*(py-y1) - (y2-y1)*(px-x1);
}

function updateTracks(dets) {
    const now = Date.now();
    tracks = tracks.filter(t => now - t.lastSeen < 4000);

    for (const det of dets) {
        let best = null, bestD = Infinity;
        for (const t of tracks) {
            const d = Math.hypot(det.cx-t.cx, det.cy-t.cy);
            if (d < 0.15 && d < bestD) { best = t; bestD = d; }
        }
        const newSide = sideOfLine(det.cx, det.cy);
        if (best) {
            if (best.side !== null && Math.sign(newSide) !== Math.sign(best.side)) {
                if (Math.hypot(det.cx-best.cx, det.cy-best.cy) > 0.02) {
                    crossings++;
                    console.log(`[Det] Cruzamento #${crossings}`);
                }
            }
            Object.assign(best, { cx:det.cx, cy:det.cy, w:det.w, h:det.h, side:newSide, lastSeen:now });
        } else {
            tracks.push({ id:nextTrackId++, cx:det.cx, cy:det.cy, w:det.w, h:det.h, side:newSide, lastSeen:now });
        }
    }
}

// ── ONNX ──────────────────────────────────────────────────────────────────────
let ort = null, session = null;

async function loadModel() {
    ort     = require('onnxruntime-node');
    session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
    });
    console.log('[ONNX] Modelo carregado:', MODEL_PATH);
}

async function runDetection(rgbBuf) {
    if (!session || frameProcessing) return;
    frameProcessing = true;
    try {
        const f32    = preprocessRaw(rgbBuf);
        const tensor = new ort.Tensor('float32', f32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
        const res    = await session.run({ [session.inputNames[0]]: tensor });
        const dets   = postprocess(res[session.outputNames[0]].data);
        updateTracks(dets);
        broadcastBoxes();
    } catch (e) {
        console.error('[Det] Erro:', e.message);
    } finally {
        frameProcessing = false;
    }
}

// ── Pipeline ffmpeg contínuo (raw RGB24 @ 3fps) ───────────────────────────────
function startPipeline() {
    if (ffpipe) return;

    console.log('[FFmpeg] Iniciando pipeline contínuo...');
    ffpipe = spawn('ffmpeg', [
        '-y', '-tls_verify', '0',
        '-i', HLS_STREAM,
        '-vf', `fps=3,scale=${INPUT_SIZE}:${INPUT_SIZE}`,
        '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    ffpipe.stdout.on('data', chunk => {
        pipelineBuffer = Buffer.concat([pipelineBuffer, chunk]);
        while (pipelineBuffer.length >= FRAME_SIZE) {
            const frame = pipelineBuffer.slice(0, FRAME_SIZE);
            pipelineBuffer = pipelineBuffer.slice(FRAME_SIZE);
            if (detectorActive) runDetection(frame);
        }
    });

    ffpipe.stderr.on('data', () => {}); // suppress ffmpeg output

    ffpipe.on('close', async code => {
        console.log(`[FFmpeg] Encerrado (code=${code}), reiniciando em 5s...`);
        ffpipe = null;
        pipelineBuffer = Buffer.alloc(0);

        // Se a stream caiu durante uma rodada ativa, cancela o mercado e reembolsa
        if (detectorActive && currentRound) {
            console.warn('[FFmpeg] Stream perdida durante rodada — cancelando mercado e reembolsando...');
            if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
            if (roundTimer)   { clearTimeout(roundTimer);    roundTimer   = null; }
            detectorActive = false;

            await supabase.from('rounds')
                .update({ status: 'finished', actual_count: crossings })
                .eq('id', currentRound.id);

            // Envia webhook de cancelamento (void) para reembolsar apostas
            await sendWebhook('void', currentRound.id, {
                reason: 'stream_failure',
                actual_count: crossings,
            });

            if (broadcastCh) { supabase.removeChannel(broadcastCh); broadcastCh = null; broadcastReady = false; }
            currentRound = null;

            // Aguarda 60s antes de tentar nova rodada (aguarda stream recuperar)
            setTimeout(startRound, 60_000);
        }

        setTimeout(startPipeline, 5000);
    });
}

function stopPipeline() {
    if (ffpipe) { ffpipe.kill('SIGTERM'); ffpipe = null; }
    pipelineBuffer = Buffer.alloc(0);
}

// ── Supabase Realtime Broadcast ───────────────────────────────────────────────
async function initBroadcast(roundId) {
    if (broadcastCh) { supabase.removeChannel(broadcastCh); }
    broadcastReady = false;
    broadcastCh = supabase.channel(`det-${roundId}`, {
        config: { broadcast: { self: false, ack: false } },
    });
    await new Promise(resolve => {
        broadcastCh.subscribe(status => {
            if (status === 'SUBSCRIBED') {
                broadcastReady = true;
                console.log('[Broadcast] Pronto:', `det-${roundId}`);
                resolve();
            }
        });
        setTimeout(resolve, 8000); // timeout de segurança
    });
}

function broadcastBoxes() {
    if (!broadcastCh || !broadcastReady) return;
    broadcastCh.send({
        type: 'broadcast', event: 'det',
        payload: {
            boxes: tracks.map(t => ({
                id: t.id,
                cx: +t.cx.toFixed(3), cy: +t.cy.toFixed(3),
                w:  +(t.w ?? 0.08).toFixed(3), h: +(t.h ?? 0.10).toFixed(3),
            })),
            count: crossings,
        },
    });
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function syncCount(roundId) {
    await supabase.from('rounds').update({ actual_count: crossings }).eq('id', roundId);
}

async function getTargetCount() {
    // Ignora rounds com actual_count <= 10 (cleanup/crashes sem detecção real)
    const { data } = await supabase
        .from('rounds').select('actual_count')
        .eq('status', 'finished')
        .gt('actual_count', 10)
        .order('end_time', { ascending: false })
        .limit(1).maybeSingle();
    return data?.actual_count ?? 100;
}

// ── Cleanup de rodadas órfãs (restarts anteriores) ────────────────────────────
async function cleanupOrphanRounds() {
    const { data } = await supabase
        .from('rounds').select('id, end_time, actual_count')
        .eq('status', 'active');
    if (!data?.length) return;

    console.log(`[Cleanup] Fechando ${data.length} rodada(s) órfã(s)...`);
    for (const r of data) {
        const count = r.actual_count ?? 0;
        await supabase.from('rounds')
            .update({ status: 'finished', actual_count: count })
            .eq('id', r.id);
        await sendWebhook('end', r.id, {
            actual_count:   count,
            rounded_count:  Math.ceil(count / 10) * 10,
        });
    }
}

// ── Encerra rodada atual ──────────────────────────────────────────────────────
async function finishRound(roundRow) {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (roundTimer)   { clearTimeout(roundTimer);    roundTimer   = null; }
    detectorActive = false;

    await syncCount(roundRow.id);
    await supabase.from('rounds')
        .update({ status: 'finished', actual_count: crossings })
        .eq('id', roundRow.id);

    const roundedCount = Math.ceil(crossings / 10) * 10;
    console.log(`[Rodada] Encerrada: ${roundRow.id} | Final: ${crossings} | Arredondado: ${roundedCount}`);
    await sendWebhook('end', roundRow.id, { actual_count: crossings, rounded_count: roundedCount });

    if (broadcastCh) { supabase.removeChannel(broadcastCh); broadcastCh = null; broadcastReady = false; }
    currentRound = null;

    console.log(`[Rodada] Próxima em ${BETWEEN_ROUNDS_MS/1000}s...`);
    setTimeout(startRound, BETWEEN_ROUNDS_MS);
}

// ── Inicia rodada ─────────────────────────────────────────────────────────────
async function startRound() {
    if (detectorActive) return;

    // Verifica horário operacional (09h-20h BRT)
    if (!isOperatingHours()) {
        const h = getBRTHour();
        const waitMs = h < 9
            ? ((9 - h) * 60 * 60_000)
            : ((33 - h) * 60 * 60_000); // espera até 09h do dia seguinte
        console.log(`[Rodada] Fora do horário (${h}h BRT). Aguardando até 09h...`);
        return setTimeout(startRound, Math.min(waitMs, 5 * 60_000)); // re-verifica em até 5min
    }

    // Verifica se stream está acessível
    const streamOk = await checkStreamAccessible();
    if (!streamOk) {
        console.warn('[Rodada] Stream inacessível. Tentando novamente em 30s...');
        return setTimeout(startRound, 30_000);
    }

    const targetCount = await getTargetCount();
    const startTime   = new Date().toISOString();
    const endTime     = new Date(Date.now() + ROUND_DURATION_MS).toISOString();

    const { data: row, error } = await supabase.from('rounds')
        .insert({ start_time: startTime, end_time: endTime, status: 'active', actual_count: 0, target_count: targetCount })
        .select().single();

    if (error || !row) {
        console.error('[Rodada] Erro ao criar:', error?.message);
        return setTimeout(startRound, 5000);
    }

    currentRound   = row;
    crossings      = 0;
    tracks         = [];
    detectorActive = true;

    console.log(`[Rodada] Iniciada: ${row.id} | Meta: ${targetCount}`);
    await sendWebhook('start', row.id, { target_count: targetCount, end_time: endTime });
    await initBroadcast(row.id);

    // Sync a cada 1s
    syncInterval = setInterval(() => syncCount(row.id), 1000);

    // Encerramento automático
    roundTimer = setTimeout(() => finishRound(row), ROUND_DURATION_MS);
}

// ── Verificação de stream / horário BRT ───────────────────────────────────────
function getBRTHour() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    return new Date(utcMs - 3 * 60 * 60_000).getHours();
}

function isOperatingHours() {
    const h = getBRTHour();
    return h >= 9 && h < 20;
}

/** Faz uma HEAD no m3u8 e verifica se a resposta é 2xx ou 3xx */
function checkStreamAccessible() {
    return new Promise(resolve => {
        const url = new URL(HLS_STREAM);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.request(
            { method: 'HEAD', hostname: url.hostname, port: url.port || 443, path: url.pathname, rejectUnauthorized: false },
            res => resolve(res.statusCode >= 200 && res.statusCode < 400)
        );
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => { req.destroy(); resolve(false); });
        req.end();
    });
}

// ── Health-check ──────────────────────────────────────────────────────────────
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ok: true,
        round:   currentRound?.id ?? null,
        crossings,
        tracks:  tracks.length,
        active:  detectorActive,
        ffmpeg:  !!ffpipe,
    }));
}).listen(3001, () => console.log('[HTTP] Health-check em :3001'));

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
    const fs = require('fs');
    if (!fs.existsSync(MODEL_PATH)) {
        console.error('[Boot] Modelo não encontrado:', MODEL_PATH);
        process.exit(1);
    }

    await loadModel();
    await cleanupOrphanRounds();

    // Inicia pipeline de frames (roda sempre, mesmo entre rodadas)
    startPipeline();

    // Pequena espera para o pipeline conectar antes da primeira rodada
    setTimeout(startRound, 5000);
})();
