
const BASE_URL = "https://api.xgateglobal.com";

interface CreateChargeParams {
    amount: number;
    description?: string;
    userId: string;
    user?: {
        name: string;
        email: string;
        phone?: string;
        document?: string;
    }
}

interface XGateResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export const XGateService = {
    async createPixCharge(params: CreateChargeParams): Promise<XGateResponse> {
        async function login() {
            const email = process.env.XGATE_EMAIL;
            const password = process.env.XGATE_PASSWORD;

            if (!email || !password) {
                throw new Error("XGATE_EMAIL or XGATE_PASSWORD not configured");
            }

            console.log("[XGate] Authenticating...");
            const res = await fetch(`${BASE_URL}/auth/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(`Auth failed: ${err.message || res.statusText}`);
            }

            const data = await res.json();
            return data.token;
        }

        async function getBrlCurrency(token: string) {
            console.log("[XGate] Fetching currencies...");
            const res = await fetch(`${BASE_URL}/deposit/company/currencies`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error("Failed to fetch currencies");
            }

            const currencies = await res.json();
            // Find BRL
            const brl = currencies.find((c: any) => c.name === 'BRL' || c.symbol === 'R$');
            if (!brl) throw new Error("Currency BRL not found");
            return brl;
        }

        try {
            const token = await login();
            const brlCurrency = await getBrlCurrency(token);

            // Exact endpoint from docs: POST /deposit
            const endpoint = `${BASE_URL}/deposit`;

            const payload = {
                amount: params.amount,
                currency: brlCurrency, // Pass full object
                customer: {
                    // Use real user data — never use test/fake CPF
                    name: params.user?.name || "Cliente Predity",
                    email: params.user?.email || "email@predity.com",
                    phone: params.user?.phone || "5511999999999",
                    // document is required by XGate — use real CPF only, blank if missing
                    ...(params.user?.document ? { document: params.user.document } : {})
                }
            };

            if (!params.user?.document) {
                console.warn("[XGate] WARNING: User has no CPF/document registered. Sending charge without document field.");
            }

            console.log(`[XGate] Creating Deposit at ${endpoint}`, JSON.stringify(payload));

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log("[XGate] Response:", data);

            if (!response.ok) {
                return { success: false, error: data.message || JSON.stringify(data) || "Failed to create deposit" };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error("XGate Exception:", error);
            return { success: false, error: error.message };
        }
    },

    async checkStatus(txId: string): Promise<XGateResponse> {
        // This function might need logged-in token too, but let's keep it simple or implement login if needed.
        // For now, let's assume checkPaymentStatus isn't heavily used or user prompts "I paid".
        // Actually, we should probably login here too to be safe.
        // But let's fix Deposit first.
        return { success: false, error: "Not implemented" };
    }
};
