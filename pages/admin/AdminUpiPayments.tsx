import React, { useState, useEffect, useCallback } from 'react';

interface UpiOrder {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: 'pending' | 'verifying' | 'paid' | 'failed' | 'expired';
    status: string;
    upiTxnRef?: string;
    upiUtr?: string;
    upiUtrAttempts: number;
    minutesLeft: number;
    paidAt?: string;
    rejectionReason?: string;
    createdAt: string;
    customer: {
        name: string;
        email?: string;
        phone?: string;
    };
    itemCount: number;
}

interface AdminUpiPaymentsProps {
    token?: string;
}

export const AdminUpiPayments: React.FC<AdminUpiPaymentsProps> = ({ token }) => {
    const [orders, setOrders] = useState<UpiOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'verifying' | 'pending' | 'paid' | 'expired'>('verifying');

    // Modals state
    const [approveModalOrder, setApproveModalOrder] = useState<UpiOrder | null>(null);
    const [rejectModalOrder, setRejectModalOrder] = useState<UpiOrder | null>(null);
    const [rejectReason, setRejectReason] = useState('Payment not received in bank account / UTR mismatch');
    const [releaseStock, setReleaseStock] = useState(true);
    const [releaseCoupon, setReleaseCoupon] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const statusQuery = filter === 'all' ? '' : `?status=${filter}`;
            const res = await fetch(`${apiUrl}/orders/admin/upi-payments${statusQuery}`, {
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            if (!res.ok) throw new Error('Failed to load UPI payments');
            const data = await res.json();
            setOrders(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Error fetching UPI orders');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, token, filter]);

    useEffect(() => {
        fetchOrders();
        // Auto-refresh every 30 seconds
        const timer = setInterval(fetchOrders, 30000);
        return () => clearInterval(timer);
    }, [fetchOrders]);

    const handleApprove = async () => {
        if (!approveModalOrder) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${apiUrl}/orders/${approveModalOrder._id}/upi-approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to approve');
            setApproveModalOrder(null);
            fetchOrders();
        } catch (err: any) {
            alert(err.message || 'Error approving order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectModalOrder) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${apiUrl}/orders/${rejectModalOrder._id}/upi-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    reason: rejectReason,
                    releaseStock,
                    releaseCoupon
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to reject');
            setRejectModalOrder(null);
            fetchOrders();
        } catch (err: any) {
            alert(err.message || 'Error rejecting order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExpireStale = async () => {
        try {
            const res = await fetch(`${apiUrl}/orders/admin/expire-stale-upi`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            alert(data.message || 'Cleaned up stale orders');
            fetchOrders();
        } catch (err: any) {
            alert('Failed to expire stale orders');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verifying':
            case 'late_payment-reinstated':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-900/60 text-blue-300 border border-blue-700 animate-pulse">Verifying UTR</span>;
            case 'pending':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-900/60 text-amber-300 border border-amber-700">Awaiting UTR</span>;
            case 'late_payment':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-900/60 text-purple-300 border border-purple-700">Late Payment</span>;
            case 'refund_needed':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-900/60 text-orange-300 border border-orange-700">Refund Required</span>;
            case 'paid':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">Paid & Verified</span>;
            case 'expired':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-800 text-gray-400 border border-gray-700">Expired</span>;
            case 'failed':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-900/60 text-rose-300 border border-rose-700">Rejected</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-800 text-gray-300">{status}</span>;
        }
    };

    const handleReinstate = async (orderId: string) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${apiUrl}/orders/${orderId}/upi-reinstate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to reinstate');
            alert('Order reinstated with reserved stock. You can now approve payment.');
            fetchOrders();
        } catch (err: any) {
            alert(err.message || 'Error reinstating order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefundNeeded = async (orderId: string) => {
        const reason = prompt('Enter note for refund (e.g. Item out of stock):', 'Expired order with items unavailable. Refund customer via original bank account.');
        if (!reason) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${apiUrl}/orders/${orderId}/upi-refund-needed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to record refund needed');
            fetchOrders();
        } catch (err: any) {
            alert(err.message || 'Error recording refund status');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-white">
                        UPI Intent Payments Management
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                        Verify customer-submitted 12-digit bank UTR numbers against your business bank statement before shipping.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExpireStale}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 transition"
                    >
                        Expire Stale Orders
                    </button>
                    <button
                        onClick={fetchOrders}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-maroon-600 hover:bg-maroon-500 text-white shadow transition"
                    >
                        Refresh List
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 border-b border-gray-700 pb-3 overflow-x-auto">
                {(['verifying', 'pending', 'paid', 'expired', 'all'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                            filter === tab
                                ? 'bg-maroon-600 text-white shadow'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        }`}
                    >
                        {tab === 'verifying' ? 'Needs Verification' : tab}
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-700 text-rose-300 text-sm rounded-lg">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading UPI payments...</div>
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No UPI orders found under status "{filter}".
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-900/60 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                                <tr>
                                    <th className="py-3 px-4">Order / Time</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">UTR Reference</th>
                                    <th className="py-3 px-4">Payment Status</th>
                                    <th className="py-3 px-4">Window Left</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/60">
                                {orders.map(o => (
                                    <tr key={o._id} className="hover:bg-gray-750/50 transition">
                                        <td className="py-3 px-4">
                                            <div className="font-mono font-bold text-white">#{o.orderNumber}</div>
                                            <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-white">{o.customer.name}</div>
                                            <div className="text-xs text-gray-400">{o.customer.phone || o.customer.email || '—'}</div>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-white text-base">
                                            ₹{o.totalAmount}
                                        </td>
                                        <td className="py-3 px-4">
                                            {o.upiUtr ? (
                                                <div>
                                                    <span className="font-mono font-bold text-emerald-400 tracking-wider bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                                                        {o.upiUtr}
                                                    </span>
                                                    {o.upiUtrAttempts > 1 && (
                                                        <div className="text-[10px] text-amber-400 mt-1">
                                                            Attempt {o.upiUtrAttempts}/5
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic">Not submitted</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(o.paymentStatus)}
                                        </td>
                                        <td className="py-3 px-4 text-xs font-medium">
                                            {o.paymentStatus === 'pending' || o.paymentStatus === 'verifying' ? (
                                                o.minutesLeft > 0 ? (
                                                    <span className={o.minutesLeft <= 3 ? 'text-rose-400 font-bold' : 'text-amber-300'}>
                                                        {o.minutesLeft} min left
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-400 font-bold">Expired</span>
                                                )
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {o.paymentStatus === 'verifying' || o.paymentStatus === 'late_payment-reinstated' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setApproveModalOrder(o)}
                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow transition"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRejectModalOrder(o);
                                                            setRejectReason('Payment was not received in bank account / UTR mismatch');
                                                        }}
                                                        className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-bold transition"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : o.paymentStatus === 'late_payment' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleReinstate(o._id)}
                                                        className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold shadow transition"
                                                        title="Check stock & reinstate order to verifying status"
                                                    >
                                                        Reinstate
                                                    </button>
                                                    <button
                                                        onClick={() => handleRefundNeeded(o._id)}
                                                        className="px-2.5 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs font-bold transition"
                                                        title="Mark as refund needed"
                                                    >
                                                        Refund
                                                    </button>
                                                </div>
                                            ) : o.paymentStatus === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setRejectModalOrder(o);
                                                            setRejectReason('Cancelled by store / unpaid');
                                                        }}
                                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-medium transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic">Completed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approve Confirmation Modal */}
            {approveModalOrder && (
                <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700 shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Confirm UPI Payment Receipt
                        </h3>
                        <p className="text-sm text-gray-300">
                            Please check your bank app (SBI/YONO/UPI statement) and verify that you received the exact amount before approving:
                        </p>
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Order ID:</span>
                                <span className="font-mono font-bold text-white">#{approveModalOrder.orderNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Expected Amount:</span>
                                <span className="font-bold text-emerald-400 text-base">₹{approveModalOrder.totalAmount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Customer UTR:</span>
                                <span className="font-mono font-bold text-white">{approveModalOrder.upiUtr || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Customer:</span>
                                <span className="text-white">{approveModalOrder.customer.name}</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setApproveModalOrder(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                            >
                                {actionLoading ? 'Approving...' : 'Yes, Payment Verified'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalOrder && (
                <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700 shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                            Reject UPI Payment
                        </h3>
                        <p className="text-sm text-gray-300">
                            Rejecting this payment will mark order #{rejectModalOrder.orderNumber} as failed and notify the customer.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">
                                    Rejection Reason (visible to customer)
                                </label>
                                <input
                                    type="text"
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-maroon-500"
                                    placeholder="e.g. UTR not found in bank statement"
                                />
                            </div>
                            <div className="space-y-2 pt-1 text-xs text-gray-300">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={releaseStock}
                                        onChange={e => setReleaseStock(e.target.checked)}
                                        className="rounded bg-gray-900 border-gray-700 text-maroon-600 focus:ring-0"
                                    />
                                    <span>Restore reserved product stock</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={releaseCoupon}
                                        onChange={e => setReleaseCoupon(e.target.checked)}
                                        className="rounded bg-gray-900 border-gray-700 text-maroon-600 focus:ring-0"
                                    />
                                    <span>Release applied coupon code for customer reuse</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setRejectModalOrder(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold shadow"
                            >
                                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

