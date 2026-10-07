import React, { useState, useEffect } from 'react';
import { Package, X, CheckCircle, Search, AlertCircle, Clock, Truck, MapPin } from 'lucide-react';
import { Order, OrderStatus } from '../types';

export const TrackOrderModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#track') {
                setIsOpen(true);
            } else {
                setIsOpen(false);
                setOrder(null);
                setError('');
            }
        };

        handleHashChange(); // Check on mount
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleClose = () => {
        window.location.hash = ''; // Clear hash which closes modal via effect
    };

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setOrder(null);
        setLoading(true);

        try {
            const res = await fetch('/api/orders/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId.trim(), mobile: mobile.trim() })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || 'Failed to track order');
            }

            setOrder(data);
        } catch (err: any) {
            setError(err.message || 'Failed to track order. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case 'Processing': return <Clock className="w-6 h-6 text-blue-500" />;
            case 'Packed': return <Package className="w-6 h-6 text-indigo-500" />;
            case 'Out for Delivery': return <Truck className="w-6 h-6 text-orange-500" />;
            case 'Delivered': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            case 'Cancelled': return <AlertCircle className="w-6 h-6 text-red-500" />;
            default: return <Clock className="w-6 h-6 text-gray-400" />;
        }
    };

    const STATUS_STEPS: OrderStatus[] = [OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED];
    const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-ink-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-cream-50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-scale-up">
                {/* Header */}
                <div className="bg-maroon-900 text-cream-50 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Package className="text-gold-500" />
                        <h2 className="text-xl font-bold font-serif">Track Your Order</h2>
                    </div>
                    <button onClick={handleClose} className="text-cream-50/70 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {!order ? (
                        <form onSubmit={handleTrack} className="space-y-4">
                            <p className="text-ink-600 text-sm mb-6">
                                Enter your Order ID and the Mobile Number used during checkout to track your package status.
                            </p>
                            
                            <div>
                                <label className="block text-sm font-semibold text-ink-900 mb-1.5">Order ID</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 64afb2342c3..."
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-ink-900 focus:outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-ink-900 mb-1.5">Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="Enter 10-digit mobile number"
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-ink-900 focus:outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !orderId || !mobile}
                                className="w-full bg-maroon-900 text-white font-bold py-3.5 rounded-lg shadow-md shadow-maroon-900/20 hover:bg-maroon-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Search size={18} />
                                        <span>Track Order</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Order ID</p>
                                    <p className="font-mono text-sm font-semibold text-ink-900">{order._id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                                    <p className="text-sm font-semibold text-ink-900">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Status Stepper */}
                            <div className="py-4">
                                {order.status === 'Cancelled' ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-red-600 mb-2">Order Cancelled</h3>
                                        <p className="text-gray-600 text-sm">This order has been cancelled.</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Progress Bar Background */}
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                                        
                                        {/* Progress Bar Fill */}
                                        <div 
                                            className="absolute left-6 top-0 w-0.5 bg-emerald-500 transition-all duration-1000"
                                            style={{ 
                                                height: currentStepIndex >= 0 
                                                    ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` 
                                                    : '0%' 
                                            }}
                                        />

                                        <div className="space-y-8 relative">
                                            {STATUS_STEPS.map((step, idx) => {
                                                const isCompleted = currentStepIndex >= idx;
                                                const isCurrent = currentStepIndex === idx;
                                                
                                                return (
                                                    <div key={step} className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500 ${isCompleted ? 'bg-emerald-100 text-emerald-600 ring-4 ring-white' : 'bg-gray-100 text-gray-400 ring-4 ring-white'}`}>
                                                            {getStatusIcon(step as OrderStatus)}
                                                        </div>
                                                        <div>
                                                            <p className={`font-bold text-lg ${isCompleted ? 'text-ink-900' : 'text-gray-400'}`}>
                                                                {step}
                                                            </p>
                                                            {isCurrent && (
                                                                <p className="text-sm text-emerald-600 font-medium">Currently active step</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 flex gap-4 items-start">
                                <div className="mt-1 text-maroon-900">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-ink-900 mb-1">Shipping Address</h4>
                                    <p className="text-sm text-gray-600">
                                        {order.shippingAddress.fullName}<br />
                                        {order.shippingAddress.houseNo}, {order.shippingAddress.street}<br />
                                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pinCode}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setOrder(null)}
                                className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Track Another Order
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
