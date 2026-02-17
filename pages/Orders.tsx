
import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Order, OrderStatus } from '../types';
import { mockApi } from '../services/mockService';

const statusColors: Record<OrderStatus, string> = {
    'Processing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Packed': 'bg-blue-100 text-blue-800 border-blue-300',
    'Out for Delivery': 'bg-purple-100 text-purple-800 border-purple-300',
    'Delivered': 'bg-green-100 text-green-800 border-green-300',
};

const statusIcons: Record<OrderStatus, string> = {
    'Processing': 'fa-clock',
    'Packed': 'fa-box',
    'Out for Delivery': 'fa-truck',
    'Delivered': 'fa-check-circle',
};

export const Orders: React.FC = () => {
    const { getUserOrders } = useOrders();
    const { user } = useAuth();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    if (!user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="text-center">
                    <i className="fas fa-shopping-bag text-6xl text-gold-500 mb-4"></i>
                    <h2 className="text-2xl font-bold text-white mb-2">Please Log In</h2>
                    <p className="text-gray-400 mb-6">You need to be logged in to view your orders</p>
                    <Link to="/login" className="px-6 py-3 bg-gold-500 text-black font-bold rounded-lg hover:bg-gold-600 transition">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    const userOrders = getUserOrders(user.email);

    // Rating State
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [ratingProduct, setRatingProduct] = useState<{ id: string, name: string } | null>(null);
    const [ratingValue, setRatingValue] = useState(5);

    const handleRateProduct = async () => {
        if (ratingProduct) {
            await mockApi.addReview(ratingProduct.id, ratingValue);
            setRatingModalOpen(false);
            setRatingProduct(null);
            alert('Thank you for your rating!');
        }
    };

    return (
        <div className="min-h-screen bg-black pt-24 pb-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-white mb-2">My Orders</h1>
                    <p className="text-gray-400">Track and manage your orders</p>
                </div>

                {/* Orders List */}
                {userOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                        <i className="fas fa-box-open text-6xl text-gray-600 mb-4"></i>
                        <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
                        <p className="text-gray-400 mb-6">Start shopping to see your orders here</p>
                        <Link to="/shop" className="px-6 py-3 bg-gold-500 text-black font-bold rounded-lg hover:bg-gold-600 transition inline-block">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {userOrders.map(order => (
                            <div
                                key={order._id}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition cursor-pointer"
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Order Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white">#{order._id.slice(-6)}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${statusColors[order.status]}`}>
                                                <i className={`fas ${statusIcons[order.status]}`}></i>
                                                {order.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mb-1">
                                            {order.items.length} item{order.items.length > 1 ? 's' : ''} • ₹{order.totalAmount.toLocaleString()}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Order Items Preview */}
                                    <div className="flex gap-2">
                                        {order.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                                <span className="text-white font-bold">+{order.items.length - 3}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* View Details */}
                                    <button className="text-gold-500 hover:text-gold-400 font-semibold text-sm flex items-center gap-2">
                                        View Details
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Order Details Modal */}
                {selectedOrder && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                        <div className="bg-midnight-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gold-500/20" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-midnight-900 border-b border-white/10 p-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Order Details</h2>
                                    <p className="text-gray-400 text-sm">#{selectedOrder._id}</p>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white transition">
                                    <i className="fas fa-times text-2xl"></i>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* Status */}
                                <div>
                                    <h3 className="text-white font-bold mb-3">Order Status</h3>
                                    <div className={`px-4 py-3 rounded-lg border flex items-center gap-2 ${statusColors[selectedOrder.status]}`}>
                                        <i className={`fas ${statusIcons[selectedOrder.status]} text-xl`}></i>
                                        <span className="font-semibold">{selectedOrder.status}</span>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-white font-bold mb-3">Items ({selectedOrder.items.length})</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 bg-white/5 p-3 rounded-lg flex-wrap sm:flex-nowrap">
                                                <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover" />
                                                <div className="flex-1 min-w-[200px]">
                                                    <h4 className="text-white font-semibold">{item.name}</h4>
                                                    <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                                    <p className="text-white font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                    {selectedOrder.status === OrderStatus.DELIVERED && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRatingProduct({ id: item._id, name: item.name });
                                                                setRatingModalOpen(true);
                                                            }}
                                                            className="text-xs bg-gold-500 text-black px-3 py-1 rounded font-bold hover:bg-gold-400"
                                                        >
                                                            Rate Product
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                <div>
                                    <h3 className="text-white font-bold mb-3">Shipping Address</h3>
                                    <div className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white font-semibold">{selectedOrder.shippingAddress.fullName}</p>
                                        <p className="text-gray-400 text-sm mt-1">{selectedOrder.shippingAddress.mobile}</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            {selectedOrder.shippingAddress.houseNo}, {selectedOrder.shippingAddress.street}<br />
                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}<br />
                                            PIN: {selectedOrder.shippingAddress.pinCode}
                                        </p>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="border-t border-white/10 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-lg">Total Amount</span>
                                        <span className="text-gold-500 font-bold text-2xl">₹{selectedOrder.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rating Modal */}
                {ratingModalOpen && ratingProduct && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-midnight-900 border border-gold-500/30 p-6 rounded-xl w-full max-w-sm text-center animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-2">Rate Product</h3>
                            <p className="text-gray-400 text-sm mb-6">{ratingProduct.name}</p>

                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setRatingValue(star)}
                                        className={`text-2xl transition-transform hover:scale-110 ${star <= ratingValue ? 'text-gold-500' : 'text-gray-600'}`}
                                    >
                                        <i className="fas fa-star"></i>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRatingModalOpen(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRateProduct}
                                    className="flex-1 px-4 py-2 rounded-lg bg-gold-500 text-black font-bold hover:bg-gold-400"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
