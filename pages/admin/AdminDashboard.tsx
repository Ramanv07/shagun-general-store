
import React, { useState, useEffect } from 'react';
import { mockApi } from '../../services/mockService';
import { Order, Product, OrderStatus, User } from '../../types';
import { CATEGORIES } from '../../constants';

const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    [OrderStatus.PACKED]: 'bg-blue-100 text-blue-800 border-blue-300',
    [OrderStatus.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800 border-purple-300',
    [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-300',
};

const statusIcons: Record<OrderStatus, string> = {
    [OrderStatus.PROCESSING]: 'fa-clock',
    [OrderStatus.PACKED]: 'fa-box',
    [OrderStatus.OUT_FOR_DELIVERY]: 'fa-truck',
    [OrderStatus.DELIVERED]: 'fa-check-circle',
};

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'lehengas' | 'users'>('overview');
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [lehengas, setLehengas] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderSearch, setOrderSearch] = useState('');

    // Product Form State
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [editingLehenga, setEditingLehenga] = useState<any | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLehengaFormOpen, setIsLehengaFormOpen] = useState(false);

    // Order Detail State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        let lastTimestamp = 0;

        const pollData = async (force = false) => {
            try {
                const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
                if (needsUpdate || force) {
                    await fetchData();
                    lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
                }
            } catch (error) {
                console.error("Admin poll failed", error);
            }
        };

        pollData(true);
        const interval = setInterval(() => pollData(), 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [pData, oData, lData, uData] = await Promise.all([
                mockApi.getProducts(),
                mockApi.getOrders(),
                mockApi.getLehengas(),
                mockApi.getUsers()
            ]);
            setProducts(pData);
            setOrders(oData);
            setLehengas(lData);
            setUsers(uData);
            setLoading(false);
        } catch (error) {
            console.error("Data fetch failed", error);
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                console.log('Saving product:', editingProduct);
                await mockApi.saveProduct(editingProduct);
                console.log('Product saved successfully');
                setIsFormOpen(false);
                setEditingProduct(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product. Check console for details.');
        }
    };

    const handleSaveLehenga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLehenga) {
            await mockApi.saveLehenga(editingLehenga);
            setIsLehengaFormOpen(false);
            setEditingLehenga(null);
            fetchData();
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (confirm('Are you sure?')) {
            await mockApi.deleteProduct(id);
            fetchData();
        }
    };

    const handleDeleteLehenga = async (id: string) => {
        if (confirm('Are you sure?')) {
            await mockApi.deleteLehenga(id);
            fetchData();
        }
    };

    const handleStatusUpdate = async (id: string, status: OrderStatus) => {
        await mockApi.updateOrderStatus(id, status);
        fetchData();
        // Update selected order if open
        if (selectedOrder && selectedOrder._id === id) {
            setSelectedOrder({ ...selectedOrder, status });
        }
    };

    // Image Upload Handler
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'lehenga') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    if (type === 'product') {
                        setEditingProduct(prev => prev ? ({ ...prev, image: reader.result as string }) : null);
                    } else {
                        setEditingLehenga(prev => prev ? ({ ...prev, image: reader.result as string }) : null);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredOrders = orders.filter(order =>
        order._id.toLowerCase().includes(orderSearch.toLowerCase())
    );

    if (loading && products.length === 0) return <div className="p-10 text-white">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-midnight-950 pt-24 px-4 pb-10">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    {['overview', 'products', 'orders', 'lehengas', 'users'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2 rounded-lg capitalize font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-gold-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="glass p-6 rounded-2xl min-h-[500px]">

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-blue-600/20 border border-blue-500/30 p-6 rounded-xl">
                                <h3 className="text-blue-400 mb-2 font-medium">Total Sales</h3>
                                <p className="text-4xl font-bold text-white">₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-purple-600/20 border border-purple-500/30 p-6 rounded-xl">
                                <h3 className="text-purple-400 mb-2 font-medium">Orders</h3>
                                <p className="text-4xl font-bold text-white">{orders.length}</p>
                            </div>
                            <div className="bg-gold-600/20 border border-gold-500/30 p-6 rounded-xl">
                                <h3 className="text-gold-400 mb-2 font-medium">Products</h3>
                                <p className="text-4xl font-bold text-white">{products.length}</p>
                            </div>
                            <div className="bg-emerald-600/20 border border-emerald-500/30 p-6 rounded-xl">
                                <h3 className="text-emerald-400 mb-2 font-medium">Lehengas</h3>
                                <p className="text-4xl font-bold text-white">{lehengas.length}</p>
                            </div>
                        </div>
                    )}

                    {/* PRODUCTS */}
                    {activeTab === 'products' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl text-white font-bold">Product List</h2>
                                <button
                                    onClick={() => { setEditingProduct({}); setIsFormOpen(true); }}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    + Add Product
                                </button>
                            </div>

                            {/* Product Form Modal */}
                            {isFormOpen && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <form onSubmit={handleSaveProduct} className="glass bg-midnight-900 p-8 rounded-2xl w-full max-w-lg relative animate-fade-in-up border border-white/10">
                                        <button type="button" onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-white hover:text-red-400"><i className="fas fa-times text-xl"></i></button>
                                        <h3 className="text-xl text-white font-bold mb-6">{editingProduct?._id ? 'Edit' : 'Add'} Product</h3>

                                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                            <input
                                                placeholder="Product Name"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingProduct?.name || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                                required
                                            />

                                            <input
                                                placeholder="Price (₹)"
                                                type="number"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingProduct?.price || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                                required
                                            />

                                            <select
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingProduct?.category || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                                required
                                            >
                                                <option value="" className="bg-midnight-900 text-gray-400">Select Category</option>
                                                {CATEGORIES.filter(c => c !== 'All').map(c => (
                                                    <option key={c} value={c} className="bg-midnight-900 text-white">{c}</option>
                                                ))}
                                            </select>

                                            {/* Image Upload */}
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-sm">Product Image</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-24 h-24 bg-white/5 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                                                        {editingProduct?.image ? (
                                                            <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <i className="fas fa-image text-gray-500 text-2xl"></i>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleImageUpload(e, 'product')}
                                                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold-500 file:text-black hover:file:bg-gold-400 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <textarea
                                                placeholder="Description"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none min-h-[100px]"
                                                value={editingProduct?.description || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                                required
                                            />

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <input
                                                        placeholder="Stock Quantity"
                                                        type="number"
                                                        className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                        value={editingProduct?.stock || ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                                                        required
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        placeholder="Initial Rating (0-5)"
                                                        type="number"
                                                        step="0.1"
                                                        max="5"
                                                        className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                        value={editingProduct?.rating || ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, rating: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded border border-white/10">
                                                <input
                                                    type="checkbox"
                                                    id="isBestseller"
                                                    className="w-5 h-5 accent-gold-500"
                                                    checked={editingProduct?.isBestseller || false}
                                                    onChange={e => setEditingProduct({ ...editingProduct, isBestseller: e.target.checked })}
                                                />
                                                <label htmlFor="isBestseller" className="text-white cursor-pointer select-none">Mark as Bestseller</label>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold py-3 mt-6 rounded-lg hover:shadow-lg transition-all">
                                            Save Product
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-xs uppercase">
                                        <tr>
                                            <th className="p-3">Image</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">Category</th>
                                            <th className="p-3">Stock</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {products.map(p => (
                                            <tr key={p._id} className="hover:bg-white/5">
                                                <td className="p-3"><img src={p.image} className="w-10 h-10 rounded object-cover" alt={p.name} /></td>
                                                <td className="p-3 font-medium text-white">
                                                    {p.name}
                                                    {p.isBestseller && <span className="ml-2 text-xs bg-gold-500 text-black px-1 rounded font-bold">BESTSELLER</span>}
                                                </td>
                                                <td className="p-3">₹{p.price.toLocaleString()}</td>
                                                <td className="p-3 text-sm">{p.category}</td>
                                                <td className={`p-3 font-mono ${p.stock < 10 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                                                    {p.stock}
                                                </td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => { setEditingProduct(p); setIsFormOpen(true); }} className="text-blue-400 hover:text-blue-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-edit"></i></button>
                                                    <button onClick={() => handleDeleteProduct(p._id)} className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ORDERS */}
                    {activeTab === 'orders' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl text-white font-bold">Manage Orders</h2>
                                <input
                                    type="text"
                                    placeholder="Search by Order ID..."
                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 w-64"
                                    value={orderSearch}
                                    onChange={(e) => setOrderSearch(e.target.value)}
                                />
                            </div>

                            {filteredOrders.length === 0 && <p className="text-gray-400">No orders found.</p>}
                            {filteredOrders.map(order => (
                                <div key={order._id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-gold-500 font-bold text-lg">#{order._id}</h4>
                                            <span className="text-xs text-gray-400">• {new Date(order.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-white font-medium text-sm"><i className="fas fa-user mr-2 text-gray-500"></i>{order.shippingAddress.fullName}</p>
                                            <p className="text-white font-medium text-sm"><i className="fas fa-map-marker-alt mr-2 text-gray-500"></i>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-2">{order.items.length} items • ₹{order.totalAmount.toLocaleString()}</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">

                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-gold-500 hover:text-gold-400 text-sm font-semibold hover:underline"
                                        >
                                            View Details
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${statusColors[order.status]}`}>
                                                {order.status}
                                            </span>

                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusUpdate(order._id, e.target.value as OrderStatus)}
                                                className="bg-black/50 border border-white/20 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gold-500 cursor-pointer min-w-[140px]"
                                            >
                                                {Object.values(OrderStatus).map(s => <option key={s} value={s} className="bg-midnight-900">{s}</option>)}
                                            </select>

                                            <button
                                                onClick={async () => {
                                                    if (confirm('Delete this order?')) {
                                                        await mockApi.deleteOrder(order._id);
                                                        fetchData();
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10"
                                                title="Delete Order"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LEHENGAS */}
                    {activeTab === 'lehengas' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl text-white font-bold">Lehenga Collection</h2>
                                <button
                                    onClick={() => { setEditingLehenga({}); setIsLehengaFormOpen(true); }}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    + Add Lehenga
                                </button>
                            </div>

                            {isLehengaFormOpen && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <form onSubmit={handleSaveLehenga} className="glass bg-midnight-900 p-8 rounded-2xl w-full max-w-lg relative animate-fade-in-up border border-white/10">
                                        <button type="button" onClick={() => setIsLehengaFormOpen(false)} className="absolute top-4 right-4 text-white hover:text-red-400"><i className="fas fa-times text-xl"></i></button>
                                        <h3 className="text-xl text-white font-bold mb-6">{editingLehenga?._id ? 'Edit' : 'Add'} Lehenga</h3>

                                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                            <input
                                                placeholder="Lehenga Name"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingLehenga?.name || ''}
                                                onChange={e => setEditingLehenga({ ...editingLehenga, name: e.target.value })}
                                                required
                                            />

                                            <input
                                                placeholder="Price (₹)"
                                                type="number"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingLehenga?.price || ''}
                                                onChange={e => setEditingLehenga({ ...editingLehenga, price: Number(e.target.value) })}
                                                required
                                            />

                                            {/* Image Upload */}
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-sm">Lehenga Image</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-24 h-24 bg-white/5 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                                                        {editingLehenga?.image ? (
                                                            <img src={editingLehenga.image} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <i className="fas fa-image text-gray-500 text-2xl"></i>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleImageUpload(e, 'lehenga')}
                                                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold-500 file:text-black hover:file:bg-gold-400 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <textarea
                                                placeholder="Description"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none min-h-[100px]"
                                                value={editingLehenga?.description || ''}
                                                onChange={e => setEditingLehenga({ ...editingLehenga, description: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold py-3 mt-6 rounded-lg hover:shadow-lg transition-all">
                                            Save Lehenga
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-xs uppercase">
                                        <tr>
                                            <th className="p-3">Image</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {lehengas.map(l => (
                                            <tr key={l._id} className="hover:bg-white/5">
                                                <td className="p-3"><img src={l.image} className="w-10 h-10 rounded object-cover" alt={l.name} /></td>
                                                <td className="p-3 font-medium text-white">{l.name}</td>
                                                <td className="p-3">₹{l.price.toLocaleString()}</td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => { setEditingLehenga(l); setIsLehengaFormOpen(true); }} className="text-blue-400 hover:text-blue-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-edit"></i></button>
                                                    <button onClick={() => handleDeleteLehenga(l._id)} className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div className="space-y-4">
                            <h2 className="text-xl text-white font-bold mb-4">Registered Users</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-xs uppercase">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {users.map((user, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="p-3 font-medium text-white">{user.name}</td>
                                                <td className="p-3">{user.email}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-gold-500/20 text-gold-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-gray-500">{user._id}</td>
                                                <td className="p-3">
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`Delete user ${user.name}? This cannot be undone.`)) {
                                                                    await mockApi.deleteUser(user._id);
                                                                    fetchData();
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ORDER DETAILS MODAL */}
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
                                <div className="flex justify-between items-center">
                                    <h3 className="text-white font-bold">Current Status</h3>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedOrder.status}
                                            onChange={(e) => handleStatusUpdate(selectedOrder._id, e.target.value as OrderStatus)}
                                            className="bg-black/50 border border-white/20 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gold-500 cursor-pointer"
                                        >
                                            {Object.values(OrderStatus).map(s => <option key={s} value={s} className="bg-midnight-900">{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-white font-bold mb-3">Items ({selectedOrder.items.length})</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 bg-white/5 p-3 rounded-lg">
                                                <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover" />
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold">{item.name}</h4>
                                                    <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-white font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Customer & Shipping Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-white font-bold mb-3">Customer Info</h3>
                                        <div className="bg-white/5 p-4 rounded-lg h-full">
                                            <p className="text-white font-semibold">{selectedOrder.shippingAddress.fullName}</p>
                                            <p className="text-gray-400 text-sm mt-1 mb-1"><i className="fas fa-phone mr-2"></i>{selectedOrder.shippingAddress.mobile}</p>
                                            <p className="text-gray-400 text-sm"><i className="fas fa-envelope mr-2"></i>{selectedOrder.user?.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold mb-3">Shipping Address</h3>
                                        <div className="bg-white/5 p-4 rounded-lg h-full">
                                            <p className="text-gray-400 text-sm">
                                                {selectedOrder.shippingAddress.houseNo}, {selectedOrder.shippingAddress.street}<br />
                                                {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}<br />
                                                PIN: {selectedOrder.shippingAddress.pinCode}
                                            </p>
                                        </div>
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
            </div>
        </div>
    );
};
