/**
 * PaymentProvider Architecture
 * Supports current manual UPI intent flow and future automated payment gateways (Razorpay, Cashfree, etc.)
 */

export class PaymentProvider {
    /**
     * Build payment intent parameters on the server
     * @param {Object} order - Mongoose Order document
     * @param {Object} config - Store payment configuration
     * @returns {Promise<Object>} Intent payload
     */
    async createPaymentIntent(order, config) {
        throw new Error('createPaymentIntent must be implemented by payment provider');
    }

    /**
     * Verify payment status
     * @param {Object} order - Mongoose Order document
     * @param {Object} paymentData - Verification data (e.g. UTR or gateway signature)
     * @returns {Promise<Object>} Verification result
     */
    async verifyPayment(order, paymentData) {
        throw new Error('verifyPayment must be implemented by payment provider');
    }

    /**
     * Webhook processor for gateway callbacks
     * @param {Object} payload 
     * @param {string} signature 
     * @returns {Promise<Object>}
     */
    async handleWebhook(payload, signature) {
        throw new Error('handleWebhook must be implemented by payment provider');
    }
}

export class UpiManualProvider extends PaymentProvider {
    async createPaymentIntent(order, config = {}) {
        const pa = config.upi_vpa ? String(config.upi_vpa).trim() : null;
        const pn = config.upi_name ? String(config.upi_name).trim() : null;
        if (!pa || !pn) {
            throw new Error('UPI payments are not configured by store management');
        }

        // Server total recomputed, strictly two decimal places
        const am = Number(order.totalAmount).toFixed(2);
        const cu = 'INR';
        const orderIdStr = order._id.toString();
        // Short friendly description and unique alphanumeric transaction reference (<= 35 chars)
        const tn = `Order ${orderIdStr.slice(-8).toUpperCase()}`;
        const tr = `SM${orderIdStr}`;
        const mc = config.merchant_code ? String(config.merchant_code).trim() : null;

        // Build standard NPCI UPI URI with strict URL encoding
        let upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}&cu=${encodeURIComponent(cu)}&tn=${encodeURIComponent(tn)}&tr=${encodeURIComponent(tr)}`;
        if (mc) {
            upiUri += `&mc=${encodeURIComponent(mc)}`;
        }

        return {
            pa,
            pn,
            am,
            cu,
            tn,
            tr,
            ...(mc ? { mc } : {}),
            upiUri
        };
    }

    async verifyPayment(order, { utr, adminId }) {
        // In manual UPI intent flow, confirmation is completed via admin verification of bank UTR
        return {
            verified: true,
            method: 'UPI_MANUAL',
            utr,
            verifiedBy: adminId,
            paidAt: new Date()
        };
    }

    async handleWebhook(_payload, _signature) {
        // Manual UPI has no external gateway webhook; returns no-op
        return { handled: false, message: 'Manual UPI does not accept gateway webhooks' };
    }
}

// Registry for pluggable payment providers
const providers = {
    UPI_MANUAL: new UpiManualProvider()
};

export function getPaymentProvider(name = 'UPI_MANUAL') {
    const provider = providers[name];
    if (!provider) {
        throw new Error(`Payment provider "${name}" is not registered`);
    }
    return provider;
}

