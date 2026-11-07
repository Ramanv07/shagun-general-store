import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. 'PRODUCT_SOFT_DELETE', 'ORDER_STATUS_UPDATE', 'SETTINGS_UPDATE', 'REVIEW_STATUS_UPDATE'
    entity: { type: String, required: true }, // 'Product' | 'Order' | 'Rental' | 'StoreSetting' | 'Review'
    entity_id: { type: String, required: true },
    before_snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    time: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

