
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
        <div className="min-h-screen bg-black pt-24 pb-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-white mb-2">My Account</h1>
                    <p className="text-gray-400">Manage your profile, saved addresses, and past orders</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Profile Card & Saved Addresses */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="fas fa-user-circle text-gold-500"></i>
                                    Profile Information
                                </h2>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-gold-500 hover:text-gold-400 font-semibold text-sm flex items-center gap-2"
                                    >
                                        <i className="fas fa-edit"></i>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setFormData({ name: user.name, email: user.email, phone: user.phone || '' });
                                                setIsEditing(false);
                                            }}
                                            className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            className="px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-600 transition text-sm font-semibold"
                                        >
                                            Save
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Full Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-white text-lg font-medium">{user.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Email Address</label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-white text-lg">{user.email}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Phone Number</label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            placeholder="Enter 10-digit mobile number"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-white text-lg">{user.phone || <span className="text-gray-500 italic">Not provided</span>}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Account Role</label>
                                    <span className="inline-block px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-xs font-semibold capitalize">
                                        {user.role}
                                    </span>
                                </div>
                            </div>

                            {/* Password Change Section */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                                    className="text-gold-500 hover:text-gold-400 font-semibold text-sm flex items-center gap-2"
                                >
                                    <i className="fas fa-key"></i>
                                    {showPasswordChange ? 'Hide Password Change' : 'Change Password'}
                                </button>

                                {showPasswordChange && (
                                    <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                            required
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                            required
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm New Password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-gold-500 text-black font-semibold py-3 rounded-lg hover:bg-gold-600 transition"
                                        >
                                            Update Password
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Saved Addresses Card */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <i className="fas fa-map-marker-alt text-gold-500"></i>
                                        Saved Delivery Addresses
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">Used to auto-fill during checkout</p>
                                </div>
                                <button
                                    onClick={() => setShowAddressModal(true)}
                                    className="px-3 py-1.5 bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/40 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
                                >
                                    <i className="fas fa-plus text-xs"></i>
                                    Add Address
                                </button>
                            </div>

                            {addresses.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-white/15 rounded-xl">
                                    <i className="fas fa-home text-gray-600 text-4xl mb-3"></i>
                                    <p className="text-gray-300 font-medium">No saved addresses yet</p>
                                    <p className="text-gray-500 text-xs mt-1 mb-4">Add your shipping address for fast 1-click checkout</p>
                                    <button
                                        onClick={() => setShowAddressModal(true)}
                                        className="px-4 py-2 bg-gold-500 text-black rounded-lg text-sm font-bold hover:bg-gold-400 transition"
                                    >
                                        Add Address Now
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {addresses.map((addr, idx) => (
                                        <div
                                            key={addr._id || idx}
                                            className={`p-4 rounded-xl border transition ${
                                                addr.isDefault 
                                                    ? 'bg-gold-500/10 border-gold-500/40' 
                                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">{addr.fullName}</span>
                                                        {addr.isDefault && (
                                                            <span className="px-2 py-0.5 bg-gold-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                                Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-xs flex items-center gap-1.5">
                                                        <i className="fas fa-phone-alt text-[10px] text-gold-500"></i>
                                                        {addr.mobile}
                                                    </p>
                                                    <p className="text-gray-300 text-sm mt-1">
                                                        {addr.houseNo}, {addr.street}
                                                    </p>
                                                    <p className="text-gray-400 text-xs">
                                                        {addr.city}, {addr.state} - <span className="text-white font-semibold">{addr.pinCode}</span>
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    {!addr.isDefault && (
                                                        <button
                                                            onClick={() => handleSetDefaultAddress(addr._id)}
                                                            className="text-xs text-gold-500 hover:text-gold-400 font-semibold"
                                                        >
                                                            Set as Default
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteAddress(addr._id)}
                                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-trash-alt text-[10px]"></i>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Quick Stats & Actions */}
                    <div className="space-y-6">
                        {/* Stats Card */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <i className="fas fa-chart-pie text-gold-500"></i>
                                Quick Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Total Orders</span>
                                    <span className="text-white font-bold text-lg">{userOrders.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-gray-400 text-sm">Saved Addresses</span>
                                    <span className="text-white font-bold text-lg">{addresses.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-400 text-sm">Account Type</span>
                                    <span className="text-gold-500 font-semibold capitalize">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    to="/orders"
                                    className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition text-center font-semibold"
                                >
                                    <i className="fas fa-shopping-bag mr-2 text-gold-500"></i>
                                    View Past Orders ({userOrders.length})
                                </Link>
                                <Link
                                    to="/shop"
                                    className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition text-center font-semibold"
                                >
                                    <i className="fas fa-store mr-2 text-gold-500"></i>
                                    Continue Shopping
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-lg transition font-semibold"
                                >
                                    <i className="fas fa-sign-out-alt mr-2"></i>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders Section */}
                {recentOrders.length > 0 && (
                    <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <i className="fas fa-history text-gold-500"></i>
                                Recent Orders
                            </h2>
                            <Link to="/orders" className="text-gold-500 hover:text-gold-400 text-sm font-semibold">
                                View All Orders ({userOrders.length}) →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentOrders.map(order => {
                                const id = order._id || (order as any).id || 'Order';
                                return (
                                    <Link
                                        key={id}
                                        to="/orders"
                                        className="block bg-white/5 p-4 rounded-lg hover:bg-white/10 transition border border-white/5"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-semibold">#{id.slice(-6)}</p>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30 font-medium">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    {order.items.length} items • ₹{order.totalAmount.toLocaleString()} • Deliver to {order.shippingAddress?.city || 'Home'}
                                                </p>
                                            </div>
                                            <span className="text-gold-500 text-sm font-semibold flex items-center gap-1">
                                                Track Order <i className="fas fa-chevron-right text-xs"></i>
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add Address Modal */}
                {showAddressModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-midnight-900 border border-gold-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="fas fa-map-marker-alt text-gold-500"></i>
                                    Add New Delivery Address
                                </h3>
                                <button
                                    onClick={() => setShowAddressModal(false)}
                                    className="text-gray-400 hover:text-white transition"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <form onSubmit={handleAddAddress} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.fullName}
                                            onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Mobile Number</label>
                                        <input
                                            type="tel"
                                            required
                                            value={addressForm.mobile}
                                            onChange={e => setAddressForm({ ...addressForm, mobile: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">House / Flat No.</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.houseNo}
                                            onChange={e => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Street / Area / Landmark</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.street}
                                            onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">City</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.city}
                                            onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">State</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.state}
                                            onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Pin Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={addressForm.pinCode}
                                            onChange={e => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                                            className="w-full bg-white/5 border border-white/15 rounded-lg p-2.5 text-white text-sm outline-none focus:border-gold-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={addressForm.isDefault}
                                        onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                                        className="rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500"
                                    />
                                    <label htmlFor="isDefault" className="text-gray-300 text-sm cursor-pointer">
                                        Set as default delivery address
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressModal(false)}
                                        className="flex-1 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-gold-500 text-black rounded-lg hover:bg-gold-600 transition text-sm font-bold"
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

