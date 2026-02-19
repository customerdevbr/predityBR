
const BASE_URL = "https://api.xgateglobal.com/api/v1";

interface CreateChargeParams {
    amount: number;
    description?: string;
    payerName?: string;
    payerEmail?: string;
    payerDoc?: string; // CPF/CNPJ
}

interface XGateResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export const XGateService = {
    async createPixCharge(params: CreateChargeParams): Promise<XGateResponse> {
        const token = process.env.XGATE_TOKEN;
        if (!token) {
            return { success: false, error: "XGATE_TOKEN not configured" };
        }

        try {
            // Based on "Criar Pedido" in FIAT > Pix section
            // URL might be /fiat/pix/orders or /gateway/pix
            // We will try /fiat/pix/orders first.
            const endpoint = `${BASE_URL}/fiat/pix/orders`;

            console.log(`[XGate] Creating Charge at ${endpoint}`, params);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: params.amount,
                    currency: "BRL",
                    description: params.description || "Deposit",
                    paymentMethod: "PIX",
                    // formatting callback if needed, but usually configured in dashboard
                })
            });

            const data = await response.json();
            console.log("[XGate] Response:", data);

            if (!response.ok) {
                return { success: false, error: data.message || JSON.stringify(data) || "Failed to create charge" };
            }

            // Normalize response
            // Expecting { id: "...", payload: "..." } or similar
            return { success: true, data };
        } catch (error: any) {
            console.error("XGate Exception:", error);
            return { success: false, error: error.message };
        }
    },

    async checkStatus(txId: string): Promise<XGateResponse> {
        const token = process.env.XGATE_TOKEN;
        if (!token) return { success: false, error: "No Token" };

        try {
            const response = await fetch(`${BASE_URL}/fiat/pix/${txId}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
