
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { Link, useNavigate } from 'react-router-dom';

export const Account: React.FC = () => {
    const { user, updateUser, logout } = useAuth();
    const { getUserOrders } = useOrders();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    if (!user) {
        navigate('/login');
        return null;
    }

    const userOrders = getUserOrders(user.email);
    const recentOrders = userOrders.slice(0, 3);

    const handleSaveProfile = () => {
        updateUser({ ...user, name: formData.name, email: formData.email });
        setIsEditing(false);
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        // In real app, verify currentPassword and update
        alert('Password changed successfully!');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
                    <p className="text-gray-400">Manage your profile and view your orders</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Profile Information</h2>
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
                                        onClick={() => setIsEditing(false)}
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
                                <label className="text-gray-400 text-sm block mb-2">Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-gold-500 outline-none"
                                    />
                                ) : (
                                    <p className="text-white text-lg">{user.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm block mb-2">Email Address</label>
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
                                <label className="text-gray-400 text-sm block mb-2">Account Type</label>
                                <p className="text-white text-lg capitalize">{user.role}</p>
                            </div>
                        </div>

                        {/* Password Change Section */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <button
                                onClick={() => setShowPasswordChange(!showPasswordChange)}
                                className="text-gold-500 hover:text-gold-400 font-semibold text-sm flex items-center gap-2"
                            >
                                <i className="fas fa-key"></i>
                                Change Password
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

                    {/* Quick Stats & Actions */}
                    <div className="space-y-6">
                        {/* Stats Card */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4">Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">Total Orders</span>
                                    <span className="text-white font-bold text-lg">{userOrders.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
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
                                    <i className="fas fa-shopping-bag mr-2"></i>
                                    View All Orders
                                </Link>
                                <Link
                                    to="/shop"
                                    className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition text-center font-semibold"
                                >
                                    <i className="fas fa-store mr-2"></i>
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

                {/* Recent Orders */}
                {recentOrders.length > 0 && (
                    <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
                            <Link to="/orders" className="text-gold-500 hover:text-gold-400 text-sm font-semibold">
                                View All →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentOrders.map(order => (
                                <Link
                                    key={order.id}
                                    to="/orders"
                                    className="block bg-white/5 p-4 rounded-lg hover:bg-white/10 transition"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-semibold">{order.id}</p>
                                            <p className="text-gray-400 text-sm">
                                                {order.items.length} items • ₹{order.totalAmount}
                                            </p>
                                        </div>
                                        <span className="text-gold-500 text-sm font-semibold">{order.status}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
