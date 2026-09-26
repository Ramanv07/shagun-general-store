
import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Order, OrderStatus } from '../types';
import { mockApi } from '../services/mockService';
import { FALLBACK_IMAGE } from '../constants';

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.PROCESSING]: 'bg-amber-50 text-amber-700 border-amber-200',
  [OrderStatus.PACKED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [OrderStatus.OUT_FOR_DELIVERY]: 'bg-purple-50 text-purple-700 border-purple-200',
  [OrderStatus.DELIVERED]: 'bg-green-50 text-green-700 border-green-200',
  [OrderStatus.CANCELLED]: 'bg-red-50 text-red-700 border-red-200',
};

const statusIcons: Record<OrderStatus, string> = {
  [OrderStatus.PROCESSING]: 'fa-clock',
  [OrderStatus.PACKED]: 'fa-box',
  [OrderStatus.OUT_FOR_DELIVERY]: 'fa-truck',
  [OrderStatus.DELIVERED]: 'fa-check-circle',
  [OrderStatus.CANCELLED]: 'fa-ban',
};

const STATUS_STEPS = [
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export const Orders: React.FC = () => {
  const { getUserOrders, updateOrderStatus } = useOrders();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingProduct, setRatingProduct] = useState<{ id: string; name: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--clr-cream)' }}>
        <div className="card p-12 text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-cream-300 flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-bag-shopping text-3xl text-maroon-400"></i>
          </div>
          <h2 className="font-serif text-2xl font-bold text-maroon-700 mb-2">Please Log In</h2>
          <p className="text-cream-700 text-sm mb-8">You need to be logged in to view your orders</p>
          <Link to="/login" className="btn btn-primary w-full justify-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const userOrders = getUserOrders(user._id || user.email);

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      await updateOrderStatus(orderId, OrderStatus.CANCELLED);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: OrderStatus.CANCELLED });
      }
    }
  };

  const handleRateProduct = async () => {
    if (ratingProduct) {
      await mockApi.addReview(ratingProduct.id, ratingValue);
      setRatingModalOpen(false);
      setRatingProduct(null);
    }
  };

  const getStepIndex = (status: OrderStatus) => STATUS_STEPS.indexOf(status);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ backgroundColor: 'var(--clr-cream)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="breadcrumb mb-2">
            <Link to="/">Home</Link>
            <i className="fas fa-chevron-right text-[8px] text-cream-600"></i>
            <span className="text-cream-700">My Orders</span>
          </div>
          <h1 className="section-title">My Orders</h1>
          <div className="section-divider" />
          <p className="text-cream-700 mt-2">Track and manage your orders</p>
        </div>

        {/* Orders List */}
        {userOrders.length === 0 ? (
          <div className="card text-center py-16 px-8">
            <div className="w-20 h-20 rounded-full bg-cream-300 flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-box-open text-3xl text-maroon-400"></i>
            </div>
            <h3 className="font-serif text-xl font-bold text-maroon-700 mb-2">No orders yet</h3>
            <p className="text-cream-700 text-sm mb-6">Start shopping to see your orders here</p>
            <Link to="/shop" className="btn btn-primary inline-flex">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map(order => (
              <div
                key={order._id}
                className="card p-5 cursor-pointer hover:border-gold-400 transition-all"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-base font-bold text-maroon-700">Order #{order._id.slice(-6)}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${statusColors[order.status]}`}>
                        <i className={`fas ${statusIcons[order.status]}`}></i>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-cream-700 text-sm mb-1">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''} &bull; Rs.{order.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-cream-600 text-xs">
                      Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="w-14 h-14 rounded-xl overflow-hidden border border-cream-300 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-14 h-14 rounded-xl bg-cream-300 flex items-center justify-center border border-cream-300">
                        <span className="text-maroon-600 font-bold text-xs">+{order.items.length - 3}</span>
                      </div>
                    )}
                  </div>

                  <button className="text-maroon-600 hover:text-gold-600 font-semibold text-sm flex items-center gap-2 transition-colors flex-shrink-0">
                    View Details <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(44,8,16,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-maroon-lg border border-cream-300"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-cream-300 p-6 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-bold text-maroon-700">Order Details</h2>
                  <p className="text-cream-600 text-xs mt-0.5">#{selectedOrder._id}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-9 h-9 rounded-full bg-cream-200 hover:bg-cream-300 flex items-center justify-center text-maroon-600 transition-colors"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status tracker */}
                {selectedOrder.status !== OrderStatus.CANCELLED && (
                  <div>
                    <h3 className="font-semibold text-maroon-700 mb-4">Order Progress</h3>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-cream-300 -z-0" />
                      <div
                        className="absolute top-4 left-0 h-0.5 bg-gold-500 -z-0 transition-all"
                        style={{ width: `${(getStepIndex(selectedOrder.status) / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                      {STATUS_STEPS.map((step, i) => {
                        const done = i <= getStepIndex(selectedOrder.status);
                        return (
                          <div key={step} className="flex flex-col items-center gap-1 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs
                              ${done ? 'bg-maroon-600 border-maroon-600 text-white' : 'bg-white border-cream-400 text-cream-500'}`}>
                              <i className={`fas ${statusIcons[step]}`}></i>
                            </div>
                            <span className={`text-[9px] font-medium text-center max-w-[60px] leading-tight ${done ? 'text-maroon-700' : 'text-cream-600'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedOrder.status === OrderStatus.CANCELLED && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <i className="fas fa-ban text-red-500"></i>
                    <span className="text-red-700 font-semibold text-sm">This order has been cancelled</span>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h3 className="font-semibold text-maroon-700 mb-3">Items ({selectedOrder.items.length})</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 bg-cream-200 p-3 rounded-xl flex-wrap sm:flex-nowrap">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-[160px]">
                          <h4 className="text-maroon-700 font-semibold text-sm">{item.name}</h4>
                          <p className="text-cream-700 text-xs mt-0.5">Qty: {item.quantity}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-maroon-700 font-bold text-sm">Rs.{(item.price * item.quantity).toLocaleString()}</p>
                          {selectedOrder.status === OrderStatus.DELIVERED && (
                            <button
                              onClick={e => { e.stopPropagation(); setRatingProduct({ id: item._id, name: item.name }); setRatingModalOpen(true); }}
                              className="btn btn-gold btn-sm text-xs"
                            >
                              Rate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold text-maroon-700 mb-3">Shipping Address</h3>
                  <div className="bg-cream-200 p-4 rounded-xl">
                    <p className="text-maroon-700 font-semibold">{selectedOrder.shippingAddress.fullName}</p>
                    <p className="text-cream-700 text-sm mt-1">{selectedOrder.shippingAddress.mobile}</p>
                    <p className="text-cream-700 text-sm mt-2">
                      {selectedOrder.shippingAddress.houseNo}, {selectedOrder.shippingAddress.street}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}<br />
                      PIN: {selectedOrder.shippingAddress.pinCode}
                    </p>
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <h3 className="font-semibold text-maroon-700 mb-3">Payment Information</h3>
                  <div className="bg-cream-200 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-maroon-700 font-medium">{selectedOrder.paymentMethod || 'Cash on Delivery (COD)'}</p>
                      <p className="text-cream-700 text-xs mt-0.5">Pay upon delivery to courier</p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
                      {selectedOrder.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-cream-300 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-maroon-700 font-bold text-lg">Total Amount</span>
                    <span className="text-maroon-600 font-bold text-2xl">Rs.{selectedOrder.totalAmount.toLocaleString()}</span>
                  </div>

                  {(selectedOrder.status === OrderStatus.PROCESSING || selectedOrder.status === OrderStatus.PACKED) && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder._id)}
                      className="w-full py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-times-circle"></i> Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModalOpen && ratingProduct && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(44,8,16,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <div className="bg-white border border-cream-300 p-6 rounded-2xl w-full max-w-sm text-center animate-scale-in shadow-maroon-lg">
              <div className="w-12 h-12 rounded-full gradient-maroon flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-star text-gold-400"></i>
              </div>
              <h3 className="font-serif text-xl font-bold text-maroon-700 mb-1">Rate Product</h3>
              <p className="text-cream-700 text-sm mb-6">{ratingProduct.name}</p>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${star <= ratingValue ? 'text-gold-500' : 'text-cream-400'}`}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setRatingModalOpen(false)} className="flex-1 btn btn-outline">
                  Cancel
                </button>
                <button onClick={handleRateProduct} className="flex-1 btn btn-gold">
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
