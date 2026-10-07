
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { Link, useNavigate } from 'react-router-dom';
import { Address } from '../types';

export const Account: React.FC = () => {
    const { user, updateUser, logout } = useAuth();
    const { getUserOrders } = useOrders();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Address Management State
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressForm, setAddressForm] = useState<Address>({
        fullName: user?.name || '',
        mobile: user?.phone || '',
        houseNo: '',
        street: '',
        city: '',
        state: 'Madhya Pradesh',
        pinCode: '471105',
        isDefault: false
    });

    if (!user) {
        navigate('/login');
        return null;
    }

    const userOrders = getUserOrders(user._id || user.email);
    const recentOrders = userOrders.slice(0, 3);
    const addresses = user.addresses || [];

    const handleSaveProfile = () => {
        updateUser({ 
            ...user, 
            name: formData.name, 
            email: formData.email, 
            phone: formData.phone 
        });
        setIsEditing(false);
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        alert('Password changed successfully!');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleAddAddress = (e: React.FormEvent) => {
        e.preventDefault();
        const shouldBeDefault = addressForm.isDefault || addresses.length === 0;

        let updatedAddresses = addresses.map(addr => 
            shouldBeDefault ? { ...addr, isDefault: false } : addr
        );

        const newAddr: Address = {
            _id: 'ADDR_' + Date.now(),
            fullName: addressForm.fullName,
            mobile: addressForm.mobile,
            houseNo: addressForm.houseNo,
            street: addressForm.street,
            city: addressForm.city,
            state: addressForm.state,
            pinCode: addressForm.pinCode,
            isDefault: shouldBeDefault
        };

        updatedAddresses.push(newAddr);

        updateUser({
            ...user,
            phone: user.phone || addressForm.mobile,
            addresses: updatedAddresses
        });

        setShowAddressModal(false);
        setAddressForm({
            fullName: user.name || '',
            mobile: user.phone || '',
            houseNo: '',
            street: '',
            city: '',
            state: 'Madhya Pradesh',
            pinCode: '471105',
            isDefault: false
        });
    };

    const handleDeleteAddress = (addrId?: string) => {
        if (!addrId) return;
        const remaining = addresses.filter(a => a._id !== addrId);
        if (remaining.length > 0 && !remaining.some(a => a.isDefault)) {
            remaining[0].isDefault = true;
        }
        updateUser({ ...user, addresses: remaining });
    };

    const handleSetDefaultAddress = (addrId?: string) => {
        if (!addrId) return;
        const updated = addresses.map(a => ({
            ...a,
            isDefault: a._id === addrId
        }));
        updateUser({ ...user, addresses: updated });
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-cream-50 pt-12 pb-16 px-5 sm:px-8">
            <div className="max-w-[1440px] mx-auto">
                {/* Header */}
                <div className="mb-8 border-b border-gray-200 pb-6">
                    <h1 className="text-3xl lg:text-4xl font-serif font-bold text-maroon-900 mb-2">My Account</h1>
                    <p className="text-ink-600">Manage your profile, saved addresses, and past orders</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Card & Saved Addresses */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Profile Card */}
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 lg:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-4">
                                <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
                                    <i className="fas fa-user-circle text-gold-500 text-2xl"></i>
                                    Profile Information
                                </h2>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-maroon-700 hover:text-maroon-900 font-semibold text-sm flex items-center gap-2 bg-maroon-50 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <i className="fas fa-edit"></i>
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => {
                                                setFormData({ name: user.name, email: user.email, phone: user.phone || '' });
                                                setIsEditing(false);
                                            }}
                                            className="px-4 py-2 border border-gray-200 text-ink-600 rounded-lg hover:bg-gray-50 transition text-sm flex-1 sm:flex-none"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            className="px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800 transition text-sm font-semibold flex-1 sm:flex-none shadow-sm"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-ink-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Full Name</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 outline-none transition-shadow"
                                            />
                                        ) : (
                                            <p className="text-ink-900 text-lg font-medium">{user.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-ink-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Email Address</label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 outline-none transition-shadow"
                                            />
                                        ) : (
                                            <p className="text-ink-900 text-lg">{user.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                    <div>
                                        <label className="text-ink-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Phone Number</label>
                                        {isEditing ? (
                                            <input
                                                type="tel"
                                                placeholder="Enter 10-digit mobile number"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 outline-none transition-shadow"
                                            />
                                        ) : (
                                            <p className="text-ink-900 text-lg">{user.phone || <span className="text-gray-400 italic text-base">Not provided</span>}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-ink-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Account Role</label>
                                        <span className="inline-block px-3 py-1 bg-gold-50 text-gold-700 border border-gold-200 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Password Change Section */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                                    className="text-maroon-700 hover:text-maroon-900 font-semibold text-sm flex items-center gap-2"
                                >
                                    <i className={`fas fa-chevron-${showPasswordChange ? 'up' : 'down'}`}></i>
                                    {showPasswordChange ? 'Cancel Password Change' : 'Change Password'}
                                </button>

                                {showPasswordChange && (
                                    <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-md bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <div>
                                            <label className="text-ink-600 text-xs font-semibold block mb-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-ink-900 focus:border-maroon-900 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-ink-600 text-xs font-semibold block mb-1">New Password</label>
                                            <input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-ink-900 focus:border-maroon-900 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-ink-600 text-xs font-semibold block mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-ink-900 focus:border-maroon-900 outline-none"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-maroon-900 text-white font-semibold py-2.5 rounded-lg hover:bg-maroon-800 transition shadow-sm mt-2"
                                        >
                                            Update Password
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Saved Addresses Card */}
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 lg:p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
                                        <i className="fas fa-map-marker-alt text-gold-500"></i>
                                        Saved Delivery Addresses
                                    </h2>
                                    <p className="text-ink-500 text-sm mt-1">Used to auto-fill during checkout</p>
                                </div>
                                <button
                                    onClick={() => setShowAddressModal(true)}
                                    className="px-4 py-2 bg-cream-100 hover:bg-cream-200 text-maroon-900 border border-maroon-900/10 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
                                >
                                    <i className="fas fa-plus"></i>
                                    Add Address
                                </button>
                            </div>

                            {addresses.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                    <i className="fas fa-home text-gray-300 text-5xl mb-4"></i>
                                    <p className="text-ink-900 font-semibold text-lg">No saved addresses yet</p>
                                    <p className="text-ink-500 text-sm mt-2 mb-6">Add your shipping address for fast 1-click checkout</p>
                                    <button
                                        onClick={() => setShowAddressModal(true)}
                                        className="px-6 py-2.5 bg-maroon-900 text-white rounded-lg text-sm font-bold hover:bg-maroon-800 transition shadow-sm inline-flex items-center gap-2"
                                    >
                                        <i className="fas fa-plus"></i> Add Address Now
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map((addr, idx) => (
                                        <div
                                            key={addr._id || idx}
                                            className={`p-5 rounded-xl border-2 transition relative ${
                                                addr.isDefault 
                                                    ? 'bg-gold-50/30 border-gold-400 shadow-sm' 
                                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                            }`}
                                        >
                                            {addr.isDefault && (
                                                <span className="absolute top-4 right-4 px-2.5 py-1 bg-gold-100 text-gold-700 text-[10px] font-bold rounded-md uppercase tracking-wider border border-gold-200">
                                                    Default
                                                </span>
                                            )}
                                            
                                            <div className="space-y-1.5 pr-16">
                                                <div className="text-ink-900 font-bold text-lg">{addr.fullName}</div>
                                                <p className="text-ink-600 text-sm flex items-center gap-2 font-medium">
                                                    <i className="fas fa-phone-alt text-xs text-gold-500"></i>
                                                    {addr.mobile}
                                                </p>
                                                <div className="text-ink-500 text-sm mt-3 leading-relaxed">
                                                    <p>{addr.houseNo}, {addr.street}</p>
                                                    <p>{addr.city}, {addr.state}</p>
                                                    <p className="font-semibold text-ink-700 pt-1">PIN: {addr.pinCode}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                                                {!addr.isDefault && (
                                                    <button
                                                        onClick={() => handleSetDefaultAddress(addr._id)}
                                                        className="text-xs text-maroon-700 hover:text-maroon-900 font-semibold transition"
                                                    >
                                                        Set as Default
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteAddress(addr._id)}
                                                    className={`text-xs flex items-center gap-1.5 transition ${addr.isDefault ? 'text-red-500 hover:text-red-600 font-semibold' : 'text-gray-400 hover:text-red-500 ml-auto'}`}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Quick Stats & Actions */}
                    <div className="space-y-8">
                        {/* Stats Card */}
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 lg:p-8">
                            <h3 className="text-ink-900 font-bold mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <i className="fas fa-chart-pie text-gold-500"></i>
                                Account Overview
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-ink-500 font-medium">Total Orders</span>
                                    <span className="text-ink-900 font-bold text-xl bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center">{userOrders.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-ink-500 font-medium">Saved Addresses</span>
                                    <span className="text-ink-900 font-bold text-xl bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center">{addresses.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-ink-500 font-medium">Account Type</span>
                                    <span className="text-gold-600 font-bold capitalize bg-gold-50 px-3 py-1 rounded-full text-sm border border-gold-100">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 lg:p-8">
                            <h3 className="text-ink-900 font-bold mb-6 border-b border-gray-100 pb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    to="/orders"
                                    className="flex items-center justify-center w-full bg-cream-50 hover:bg-cream-100 text-maroon-900 py-3.5 rounded-xl transition text-center font-bold border border-cream-200"
                                >
                                    <i className="fas fa-shopping-bag mr-2.5 text-maroon-700"></i>
                                    View Past Orders ({userOrders.length})
                                </Link>
                                <Link
                                    to="/shop"
                                    className="flex items-center justify-center w-full bg-white hover:bg-gray-50 text-ink-900 py-3.5 rounded-xl transition text-center font-bold border border-gray-200 shadow-sm"
                                >
                                    <i className="fas fa-store mr-2.5 text-gold-500"></i>
                                    Continue Shopping
                                </Link>
                                {user.role === 'admin' && (
                                    <Link
                                        to="/admin"
                                        className="flex items-center justify-center w-full bg-maroon-50 hover:bg-maroon-100 text-maroon-900 py-3.5 rounded-xl transition text-center font-bold border border-maroon-100 shadow-sm mt-3"
                                    >
                                        <i className="fas fa-shield-alt mr-2.5"></i>
                                        Admin Dashboard
                                    </Link>
                                )}
                                <div className="pt-4 mt-2 border-t border-gray-100">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl transition font-bold border border-red-100 flex items-center justify-center"
                                    >
                                        <i className="fas fa-sign-out-alt mr-2.5"></i>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders Section */}
                {recentOrders.length > 0 && (
                    <div className="mt-8 bg-white border border-gray-100 shadow-sm rounded-2xl p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
                                <i className="fas fa-history text-gold-500"></i>
                                Recent Orders
                            </h2>
                            <Link to="/orders" className="text-maroon-700 hover:text-maroon-900 text-sm font-bold bg-maroon-50 px-4 py-2 rounded-lg transition-colors">
                                View All Orders ({userOrders.length}) →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recentOrders.map(order => {
                                const id = order._id || (order as any).id || 'Order';
                                return (
                                    <Link
                                        key={id}
                                        to="/orders"
                                        className="block bg-gray-50 p-5 rounded-xl hover:bg-cream-50 hover:border-cream-200 transition border border-gray-100 group"
                                    >
                                        <div className="flex flex-col justify-between h-full gap-4">
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <p className="text-ink-900 font-bold text-lg">#{id.slice(-6)}</p>
                                                    <span className="text-xs px-2.5 py-1 rounded-md bg-gold-100 text-gold-800 border border-gold-200 font-bold tracking-wide uppercase">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-ink-600 text-sm font-medium mb-1">
                                                    {order.items.length} items • <span className="text-ink-900 font-bold">₹{order.totalAmount.toLocaleString()}</span>
                                                </p>
                                                <p className="text-ink-500 text-xs truncate flex items-center gap-1.5">
                                                    <i className="fas fa-map-marker-alt text-gray-400"></i>
                                                    Deliver to {order.shippingAddress?.city || 'Home'}
                                                </p>
                                            </div>
                                            <div className="text-maroon-700 text-sm font-bold flex items-center justify-between pt-3 border-t border-gray-200 group-hover:text-maroon-900 transition-colors">
                                                Track Order 
                                                <div className="w-6 h-6 rounded-full bg-maroon-100 flex items-center justify-center group-hover:bg-maroon-200 transition-colors">
                                                    <i className="fas fa-chevron-right text-[10px]"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add Address Modal */}
                {showAddressModal && (
                    <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-scale-up">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <h3 className="text-xl font-bold text-ink-900 flex items-center gap-2">
                                    <i className="fas fa-map-marker-alt text-gold-500"></i>
                                    Add New Delivery Address
                                </h3>
                                <button
                                    onClick={() => setShowAddressModal(false)}
                                    className="text-gray-400 hover:text-ink-900 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>

                            <form onSubmit={handleAddAddress} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.fullName}
                                            onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">Mobile Number</label>
                                        <input
                                            type="tel"
                                            required
                                            value={addressForm.mobile}
                                            onChange={e => setAddressForm({ ...addressForm, mobile: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">House / Flat No.</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.houseNo}
                                            onChange={e => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">Street / Area / Landmark</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.street}
                                            onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">City</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.city}
                                            onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">State</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.state}
                                            onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-ink-600 text-xs font-bold block mb-1.5 uppercase tracking-wide">Pin Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.pinCode}
                                            onChange={e => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-ink-900 outline-none focus:border-maroon-900 focus:ring-1 focus:ring-maroon-900 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={addressForm.isDefault}
                                        onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-maroon-900 focus:ring-maroon-900 cursor-pointer"
                                    />
                                    <label htmlFor="isDefault" className="text-ink-900 text-sm font-medium cursor-pointer flex-1">
                                        Set as default delivery address
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressModal(false)}
                                        className="flex-1 py-3 border border-gray-200 text-ink-600 bg-white rounded-xl hover:bg-gray-50 transition text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-maroon-900 text-white rounded-xl hover:bg-maroon-800 transition text-sm font-bold shadow-md"
                                    >
                                        Save Address
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


