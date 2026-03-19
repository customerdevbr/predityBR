/**
 * PATCH para o backend do contador-de-veiculos
 * =============================================
 * Substitua o conteúdo de /backend/server.js no repositório
 * https://github.com/kaueramone/contador-de-veiculos
 * por este arquivo para integrar com a PredityBR.
 *
 * Variáveis de ambiente necessárias no .env do backend:
 *   SUPABASE_URL=https://xyniubvihpgoolkpisvy.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
 *   PREDITY_API_URL=https://preditybr.com            (ou https://predity-br.vercel.app)
 *   PREDITY_WEBHOOK_SECRET=mesmo_valor_de_VEHICLE_WEBHOOK_SECRET_no_vercel
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Configuração ─────────────────────────────────────────────────────────────
const CONFIG = {
    roundDuration: 5 * 60 * 1000,       // 5 minutos
    operatingHours: { start: 9, end: 20 }, // 09h–20h BRT
    roundingStep: 10,                    // Arredonda para a dezena acima: 87 → 90
    updateIntervalMs: 5000,              // Atualiza Supabase a cada 5s
    predityApiUrl: process.env.PREDITY_API_URL,
    preditySecret: process.env.PREDITY_WEBHOOK_SECRET,
};

let currentRoundId = null;
let currentCount = 0;

// ─── Arredondamento ────────────────────────────────────────────────────────────
function roundUp(number) {
    return Math.ceil(number / CONFIG.roundingStep) * CONFIG.roundingStep;
}

// ─── Horário BRT ──────────────────────────────────────────────────────────────
function getBRTHour() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    return new Date(utcMs - 3 * 60 * 60_000).getHours();
}

function isOperating() {
    const h = getBRTHour();
    return h >= CONFIG.operatingHours.start && h < CONFIG.operatingHours.end;
}

// ─── Notifica PredityBR via Webhook ──────────────────────────────────────────
async function notifyPredity(payload) {
    if (!CONFIG.predityApiUrl || !CONFIG.preditySecret) {
        console.warn('[Predity] PREDITY_API_URL ou PREDITY_WEBHOOK_SECRET não configurados.');
        return;
    }
    try {
        const res = await fetch(`${CONFIG.predityApiUrl}/api/webhook/vehicle-round`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-secret': CONFIG.preditySecret,
            },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        console.log('[Predity] Webhook enviado:', json);
    } catch (err) {
        console.error('[Predity] Erro no webhook:', err.message);
    }
}

// ─── Inicia nova rodada ───────────────────────────────────────────────────────
async function startNewRound() {
    if (!isOperating()) {
        console.log('[Rounds] Fora do horário de operação. Standby.');
        return;
    }

    // Busca a última rodada finalizada para definir a meta
    const { data: lastRound } = await supabase
        .from('rounds')
        .select('rounded_count')
        .eq('status', 'finished')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

    const targetCount = lastRound?.rounded_count ?? 100;

    const { data, error } = await supabase
        .from('rounds')
        .insert([{ target_count: targetCount, status: 'active' }])
        .select()
        .single();

    if (error) {
        console.error('[Rounds] Erro ao iniciar rodada:', error);
        return;
    }

    currentRoundId = data.id;
    currentCount = 0;
    console.log(`[Rounds] Nova rodada: ${currentRoundId} | Meta: ${targetCount}`);

    // Notifica PredityBR para criar o mercado correspondente
    await notifyPredity({ action: 'start', round_id: currentRoundId, target_count: targetCount });
}

// ─── Finaliza rodada atual ────────────────────────────────────────────────────
async function finishRound() {
    if (!currentRoundId) return;

    const rounded = roundUp(currentCount);

    const { error } = await supabase
        .from('rounds')
        .update({
            actual_count: currentCount,
            rounded_count: rounded,
            status: 'finished',
            end_time: new Date(),
        })
        .eq('id', currentRoundId);

    if (error) {
        console.error('[Rounds] Erro ao finalizar rodada:', error);
        return;
    }

    console.log(`[Rounds] Rodada ${currentRoundId} finalizada. Real: ${currentCount} | Arredondado: ${rounded}`);

    // Notifica PredityBR para resolver o mercado e pagar os ganhadores
    await notifyPredity({
        action: 'end',
        round_id: currentRoundId,
        actual_count: currentCount,
        rounded_count: rounded,
    });

    currentRoundId = null;
}

// ─── Loop principal ────────────────────────────────────────────────────────────
async function mainLoop() {
    // Atualiza contagem no Supabase a cada 5s (substitua pelo valor real da IA)
    setInterval(async () => {
        if (!currentRoundId) return;

        // ⚠️ AQUI você integra a contagem real da IA do browser/backend
        // Por enquanto, a contagem é incrementada pelo app.js (browser/ONNX)
        // e pode ser recebida via websocket local ou atualizada externamente.

        await supabase
            .from('rounds')
            .update({ actual_count: currentCount })
            .eq('id', currentRoundId);
    }, CONFIG.updateIntervalMs);

    // Gerenciador de rodadas — verifica a cada 1 segundo
    setInterval(async () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Inicia às :00, :05, :10... (início da janela de 5 minutos)
        if (minutes % 5 === 0 && seconds === 0 && !currentRoundId) {
            await startNewRound();
        }

        // Finaliza 5 segundos antes do fim da janela para garantir processamento
        if (minutes % 5 === 4 && seconds >= 55 && currentRoundId) {
            await finishRound();
        }
    }, 1000);
}

// ─── Exporta função para receber contagem da IA (browser → backend) ──────────
// Se você implementar comunicação entre o browser (ONNX) e este backend,
// chame esta função com o novo total:
function updateCount(newCount) {
    currentCount = newCount;
}

module.exports = { updateCount };

console.log('[Contador-Veículos] Servidor iniciado com integração PredityBR...');
mainLoop();
