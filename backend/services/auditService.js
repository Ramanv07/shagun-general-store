import AuditLog from '../models/AuditLog.js';

export async function logAuditEvent(adminId, action, entity, entityId, beforeSnapshot = null) {
    try {
        let sanitizedSnapshot = null;
        if (beforeSnapshot) {
            const raw = JSON.parse(JSON.stringify(beforeSnapshot));
            // Ensure strictly NO PII is recorded in audit logs
            delete raw.password;
            delete raw.phone;
            delete raw.mobile;
            delete raw.customerPhone;
            delete raw.customerName;
            delete raw.email;
            delete raw.addresses;
            delete raw.shippingAddress;
            delete raw.pushTokens;
            sanitizedSnapshot = raw;
        }

        await AuditLog.create({
            admin_id: adminId,
            action,
            entity,
            entity_id: String(entityId),
            before_snapshot: sanitizedSnapshot,
            time: new Date()
        });
    } catch (err) {
        console.error('[AuditLog] Failed to record event:', err.message);
    }
}

