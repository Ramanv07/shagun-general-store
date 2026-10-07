
import React, { useState, useEffect } from 'react';
import { mockApi } from '../../services/mockService';
import { Order, Product, OrderStatus, User, RentalBooking, RentalStatus } from '../../types';
import { CATEGORIES } from '../../constants';

const getAuthToken = () => {
    try {
        const userStr = localStorage.getItem('shagun_current_user');
        if (userStr) {
            const u = JSON.parse(userStr);
            const token = u?.token || '';
            if (token === 'mock_admin_token' || token === 'mock_user_token') {
                return ''; // Force re-login
            }
            return token;
        }
    } catch (e) {}
    return '';
};

const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    [OrderStatus.PACKED]: 'bg-blue-100 text-blue-800 border-blue-300',
    [OrderStatus.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800 border-purple-300',
    [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-300',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons: Record<OrderStatus, string> = {
    [OrderStatus.PROCESSING]: 'fa-clock',
    [OrderStatus.PACKED]: 'fa-box',
    [OrderStatus.OUT_FOR_DELIVERY]: 'fa-truck',
    [OrderStatus.DELIVERED]: 'fa-check-circle',
    [OrderStatus.CANCELLED]: 'fa-times-circle',
};

const rentalStatusColors: Record<string, string> = {
    'Booked': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'Active': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'Returned': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'Cancelled': 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'rentals' | 'lehengas' | 'users' | 'parlor' | 'parlorServices'>('overview');
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [lehengas, setLehengas] = useState<any[]>([]);
    const [rentals, setRentals] = useState<RentalBooking[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [rentalSearch, setRentalSearch] = useState('');
    const [rentalFilter, setRentalFilter] = useState<'all' | 'Booked' | 'Active' | 'Returned' | 'Cancelled'>('all');
    const [isOfflineRentalOpen, setIsOfflineRentalOpen] = useState(false);
    const [offlineRentalData, setOfflineRentalData] = useState<any>({
        lehengaId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        startDate: '',
        returnDate: '',
        notes: ''
    });

    // Product Form State
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [editingLehenga, setEditingLehenga] = useState<any | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLehengaFormOpen, setIsLehengaFormOpen] = useState(false);

    // Order Detail State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Parlor Services State
    const [parlorServices, setParlorServices] = useState<any[]>([]);
    const [editingService, setEditingService] = useState<any | null>(null);
    const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);

    useEffect(() => {
        let lastTimestamp = 0;

        const pollData = async (force = false) => {
            if (authError) return;
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
        const interval = setInterval(() => pollData(), 10000);
        return () => clearInterval(interval);
    }, [authError]);

    const fetchData = async () => {
        try {
            const results = await Promise.allSettled([
                mockApi.getProducts(),
                mockApi.getOrders(),
                mockApi.getLehengas(),
                mockApi.getUsers(),
                mockApi.getAllRentals()
            ]);

            const [pRes, oRes, lRes, uRes, rRes] = results;

            // Check if user is unauthorized for orders or users
            if (
                (oRes.status === 'rejected' && String(oRes.reason).includes('401')) ||
                (uRes.status === 'rejected' && String(uRes.reason).includes('401'))
            ) {
                setAuthError(true);
                setLoading(false);
                return;
            }

            if (pRes.status === 'fulfilled') setProducts(pRes.value);
            if (oRes.status === 'fulfilled') setOrders(oRes.value);
            if (lRes.status === 'fulfilled') setLehengas(lRes.value);
            if (uRes.status === 'fulfilled') setUsers(uRes.value);
            if (rRes.status === 'fulfilled') setRentals(rRes.value);

            // Fetch appointments
            try {
                const token = getAuthToken();
                if (token) {
                    const apptRes = await fetch('/api/appointments', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (apptRes.ok) {
                        const data = await apptRes.json();
                        setAppointments(data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch appointments", err);
            }

            // Fetch parlor services
            try {
                const srvRes = await fetch('/api/parlor-services');
                if (srvRes.ok) {
                    const data = await srvRes.json();
                    setParlorServices(data);
                }
            } catch (err) {
                console.error("Failed to fetch parlor services", err);
            }

            setLoading(false);
        } catch (error) {
            console.error("Data fetch failed", error);
            setLoading(false);
        }
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingService._id ? 'PUT' : 'POST';
            const url = editingService._id ? `/api/parlor-services/${editingService._id}` : '/api/parlor-services';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(editingService)
            });
            if (res.ok) {
                setIsServiceFormOpen(false);
                setEditingService(null);
                fetchData();
            } else {
                alert('Failed to save service');
            }
        } catch (error) {
            console.error('Error saving service:', error);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (confirm('Are you sure you want to delete this service?')) {
            try {
                await fetch(`/api/parlor-services/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                fetchData();
            } catch (err) {
                console.error('Failed to delete service:', err);
            }
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

    const handleRentalStatusUpdate = async (id: string, status: string) => {
        try {
            await mockApi.updateRentalStatus(id, status);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to update rental status:', err);
            alert(err.message || 'Failed to update rental status');
        }
    };

    const handleDeleteRental = async (id: string) => {
        if (confirm('Are you sure you want to delete this rental booking?')) {
            try {
                await mockApi.deleteRentalBooking(id);
                await fetchData();
            } catch (err: any) {
                console.error('Failed to delete rental:', err);
                alert(err.message || 'Failed to delete rental booking');
            }
        }
    };

    const handleSaveOfflineRental = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedL = lehengas.find(l => l._id === offlineRentalData.lehengaId);
            await mockApi.createRentalBooking({
                lehengaId: offlineRentalData.lehengaId,
                customerName: offlineRentalData.customerName,
                customerPhone: offlineRentalData.customerPhone,
                customerEmail: offlineRentalData.customerEmail,
                startDate: offlineRentalData.startDate,
                returnDate: offlineRentalData.returnDate,
                rentalPrice: selectedL?.price,
                securityDeposit: 2500,
                notes: offlineRentalData.notes || 'In-store booking by admin'
            });
            setIsOfflineRentalOpen(false);
            setOfflineRentalData({
                lehengaId: '',
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                startDate: '',
                returnDate: '',
                notes: ''
            });
            await fetchData();
        } catch (err: any) {
            console.error('Failed to create offline rental:', err);
            alert(err.message || 'Failed to create offline rental booking');
        }
    };

    // Compress image to prevent localStorage QuotaExceededError
    const [imageUploading, setImageUploading] = useState(false);

    const compressImage = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (file.type === 'image/svg+xml') {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
                return;
            }
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(readerEvent.target?.result as string);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => reject(new Error('Image failed to load for compression'));
                img.src = readerEvent.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Image Upload Handler using Cloudinary API
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'lehenga') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const token = getAuthToken();
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            
            const data = await res.json();
            
            if (type === 'product') {
                setEditingProduct(prev => prev ? { ...prev, image: data.imageUrl } : null);
            } else if (type === 'lehenga') {
                setEditingLehenga(prev => {
                    if (!prev) return null;
                    const currentImages = prev.images || (prev.image ? [prev.image] : []);
                    if (currentImages.length >= 8) {
                        alert("Maximum 8 images allowed.");
                        return prev;
                    }
                    const newImages = [...currentImages, data.imageUrl];
                    return { ...prev, images: newImages, image: newImages[0] };
                });
            }
        } catch (error) {
            console.error('Image upload failed', error);
            alert('Image upload failed. Please check backend connection.');
        } finally {
            setImageUploading(false);
            e.target.value = '';
        }
    };

    const filteredOrders = orders.filter(order =>
        order._id.toLowerCase().includes(orderSearch.toLowerCase())
    );

    const filteredRentals = rentals
        .filter(r => rentalFilter === 'all' || r.status === rentalFilter)
        .filter(r => {
            if (!rentalSearch) return true;
            const q = rentalSearch.toLowerCase();
            return (
                r.customerName?.toLowerCase().includes(q) ||
                r.customerPhone?.includes(q) ||
                r.lehengaName?.toLowerCase().includes(q) ||
                r._id?.toLowerCase().includes(q)
            );
        });

    if (authError) {
        return (
            <div className="min-h-screen bg-gray-900 pt-28 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-gray-800 border border-rose-500/40 p-8 rounded-2xl text-center shadow-2xl">
                    <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i className="fas fa-lock" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Admin Session Required</h2>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        Your session has expired or you are not logged in with an authorized admin account.
                    </p>
                    <a
                        href="/login"
                        className="inline-block w-full py-3 px-6 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                        Log In as Admin
                    </a>
                </div>
            </div>
        );
    }

    if (loading && products.length === 0) {
        return (
            <div className="min-h-screen bg-gray-900 pt-28 px-4 flex flex-col items-center justify-center text-white gap-4">
                <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 pt-24 px-4 pb-10">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'products', label: 'Products' },
                        { id: 'orders', label: 'Orders' },
                        { id: 'rentals', label: 'Lehenga Rentals' },
                        { id: 'lehengas', label: 'Lehenga Catalog' },
                        { id: 'parlor', label: 'Parlor Bookings' },
                        { id: 'parlorServices', label: 'Parlor Services' },
                        { id: 'users', label: 'Users' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-maroon-600 text-white shadow-lg' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl min-h-[500px]">

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div className="bg-blue-600/20 border border-blue-500/30 p-6 rounded-xl">
                                <h3 className="text-blue-400 mb-2 font-medium">Total Sales</h3>
                                <p className="text-3xl font-bold text-white">₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-purple-600/20 border border-purple-500/30 p-6 rounded-xl">
                                <h3 className="text-purple-400 mb-2 font-medium">Orders</h3>
                                <p className="text-3xl font-bold text-white">{orders.length}</p>
                            </div>
                            <div className="bg-gold-600/20 border border-gold-500/30 p-6 rounded-xl">
                                <h3 className="text-gold-400 mb-2 font-medium">Products</h3>
                                <p className="text-3xl font-bold text-white">{products.length}</p>
                            </div>
                            <div className="bg-amber-600/20 border border-amber-500/30 p-6 rounded-xl">
                                <h3 className="text-amber-400 mb-2 font-medium">Lehenga Catalog</h3>
                                <p className="text-3xl font-bold text-white">{lehengas.length}</p>
                            </div>
                            <div className="bg-rose-600/20 border border-rose-500/30 p-6 rounded-xl">
                                <h3 className="text-rose-400 mb-2 font-medium">Lehenga Rentals</h3>
                                <p className="text-3xl font-bold text-white">{rentals.length}</p>
                                <p className="text-xs text-rose-300 mt-2 font-medium">
                                    {rentals.filter(r => r.status === 'Booked' || r.status === 'Active').length} Active / Booked
                                </p>
                            </div>
                            <div className="bg-pink-600/20 border border-pink-500/30 p-6 rounded-xl">
                                <h3 className="text-pink-400 mb-2 font-medium">Parlor Bookings</h3>
                                <p className="text-3xl font-bold text-white">{appointments.length}</p>
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
                                    <form onSubmit={handleSaveProduct} className="bg-gray-900 p-8 rounded-2xl w-full max-w-lg relative animate-fade-in-up border border-gray-700 shadow-2xl">
                                        <button type="button" onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-400"><i className="fas fa-times text-xl"></i></button>
                                        <h3 className="text-xl text-white font-bold mb-6">{editingProduct?._id ? 'Edit' : 'Add'} Product</h3>

                                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                            <input
                                                placeholder="Product Name"
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingProduct?.name || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                                required
                                            />

                                            {/* Two Price Sessions: MRP and Offer Price */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-gray-300 text-xs font-semibold block mb-1">
                                                        MRP (Original Price ₹)
                                                    </label>
                                                    <input
                                                        placeholder="e.g. 199"
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                        value={editingProduct?.mrp || ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, mrp: e.target.value ? Number(e.target.value) : undefined })}
                                                    />
                                                    <span className="text-[10px] text-gray-400 mt-0.5 block">Will show cut down / strikethrough</span>
                                                </div>

                                                <div>
                                                    <label className="text-gray-300 text-xs font-semibold block mb-1">
                                                        Offer Price / Selling Price (₹) *
                                                    </label>
                                                    <input
                                                        placeholder="e.g. 149"
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none font-bold text-gold-400"
                                                        value={editingProduct?.price || ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                                        required
                                                    />
                                                    <span className="text-[10px] text-gray-400 mt-0.5 block">Customer will buy at this price</span>
                                                </div>
                                            </div>

                                            {/* Live Price Preview */}
                                            {Boolean(editingProduct?.price) && (
                                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                    <div className="text-xs text-gray-300">
                                                        <span className="text-gray-400 font-medium">Customer sees: </span>
                                                        {editingProduct?.mrp && editingProduct.mrp > (editingProduct.price || 0) ? (
                                                            <span className="inline-flex items-baseline gap-2 ml-1">
                                                                <span className="text-gray-400 line-through">₹{editingProduct.mrp}</span>
                                                                <span className="text-gold-400 font-bold text-sm">₹{editingProduct.price}</span>
                                                                <span className="text-emerald-400 font-bold text-xs">
                                                                    ({Math.round(((editingProduct.mrp - editingProduct.price) / editingProduct.mrp) * 100)}% OFF)
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gold-400 font-bold ml-1">₹{editingProduct?.price}</span>
                                                        )}
                                                    </div>
                                                    {editingProduct?.mrp && editingProduct.mrp > (editingProduct.price || 0) && (
                                                        <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                                                            Save ₹{editingProduct.mrp - editingProduct.price}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <select
                                                className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingProduct?.category || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                                required
                                            >
                                                <option value="" className="bg-gray-900 text-gray-400">Select Category</option>
                                                {CATEGORIES.filter(c => c !== 'All').map(c => (
                                                    <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                                                ))}
                                            </select>

                                            {/* Image Upload / URL */}
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-sm font-medium">Product Image</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-20 h-20 bg-white/5 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                                                        {editingProduct?.image ? (
                                                            <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <i className="fas fa-image text-gray-500 text-2xl"></i>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Paste Image URL (or upload below)"
                                                            className="w-full bg-white/5 p-2 rounded text-white text-xs border border-white/10 focus:border-gold-500 outline-none"
                                                            value={editingProduct?.image && !editingProduct.image.startsWith('data:') ? editingProduct.image : ''}
                                                            onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, 'product')}
                                                                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gold-500 file:text-black hover:file:bg-gold-400 cursor-pointer"
                                                            />
                                                            {imageUploading && <span className="text-xs text-gold-400 font-semibold animate-pulse whitespace-nowrap">Optimizing...</span>}
                                                        </div>
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
                                                    <label className="text-gray-300 text-xs font-semibold block mb-1">
                                                        Stock Quantity *
                                                    </label>
                                                    <input
                                                        placeholder="Stock Quantity"
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                        value={editingProduct?.stock ?? ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, stock: Math.max(0, Number(e.target.value) || 0) })}
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
                                                <td className="p-3">
                                                    {p.mrp && p.mrp > p.price ? (
                                                        <div className="flex flex-col">
                                                            <div className="flex items-baseline gap-1.5">
                                                                <span className="text-gray-400 line-through text-xs">₹{p.mrp.toLocaleString()}</span>
                                                                <span className="font-bold text-white">₹{p.price.toLocaleString()}</span>
                                                            </div>
                                                            <span className="text-emerald-400 font-semibold text-[11px]">
                                                                {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="font-bold text-white">₹{p.price.toLocaleString()}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-sm">{p.category}</td>
                                                <td className="p-3">
                                                    {p.stock <= 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-900/60 text-red-300 font-bold border border-red-700/50">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                            Out of Stock (0)
                                                        </span>
                                                    ) : p.stock <= 5 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-900/50 text-amber-300 font-bold border border-amber-700/50">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                            {p.stock} (Low Stock)
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-gray-200 font-semibold">{p.stock}</span>
                                                    )}
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
                                            className="px-3 py-1.5 border border-gold-500 text-gold-500 rounded hover:bg-gold-500 hover:text-black text-sm font-semibold transition-colors"
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

                    {/* LEHENGA RENTALS */}
                    {activeTab === 'rentals' && (
                        <div className="space-y-6">
                            {/* Header and Controls */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl text-white font-bold">Bridal Lehenga Rental Bookings</h2>
                                        <span className="bg-gold-500/20 text-gold-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-gold-500/30">
                                            {rentals.length} Total Bookings
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">
                                        Manage rental booking dates, return schedules, customer info, and mark lehengas as returned to make them available.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search customer, phone, lehenga..."
                                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-gold-500 flex-1 md:w-64"
                                        value={rentalSearch}
                                        onChange={(e) => setRentalSearch(e.target.value)}
                                    />
                                    <button
                                        onClick={() => setIsOfflineRentalOpen(true)}
                                        className="bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <i className="fas fa-plus"></i> Book Offline Rental
                                    </button>
                                </div>
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {(['all', 'Booked', 'Active', 'Returned', 'Cancelled'] as const).map(filterKey => {
                                    const count = filterKey === 'all'
                                        ? rentals.length
                                        : rentals.filter(r => r.status === filterKey).length;
                                    return (
                                        <button
                                            key={filterKey}
                                            onClick={() => setRentalFilter(filterKey)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                rentalFilter === filterKey
                                                    ? 'bg-gold-500 text-black shadow-md'
                                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                        >
                                            <span>{filterKey === 'all' ? 'All Bookings' : filterKey}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rentalFilter === filterKey ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Table of Rentals */}
                            {filteredRentals.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                                    <i className="fas fa-calendar-times text-4xl text-gray-500 mb-3 block"></i>
                                    <p className="text-gray-300 font-medium">No rental bookings found</p>
                                    <p className="text-gray-500 text-xs mt-1">Bookings made by customers on web or mobile app will sync here in real-time.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-gray-300">
                                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                                            <tr>
                                                <th className="p-3">Lehenga</th>
                                                <th className="p-3">Customer Details</th>
                                                <th className="p-3">Booking / Pick-up</th>
                                                <th className="p-3">Return Date</th>
                                                <th className="p-3">Total Amount</th>
                                                <th className="p-3">Rental Status</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10 text-sm">
                                            {filteredRentals.map(rental => {
                                                const isOngoing = rental.status === 'Booked' || rental.status === 'Active';

                                                return (
                                                    <tr key={rental._id} className="hover:bg-white/5 transition-colors">
                                                        {/* Lehenga Info */}
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={rental.lehengaImage || (rental.lehenga as any)?.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800'}
                                                                    alt={rental.lehengaName}
                                                                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                                                                />
                                                                <div>
                                                                    <p className="font-semibold text-white line-clamp-1">{rental.lehengaName}</p>
                                                                    <p className="text-[11px] text-gray-400 font-mono">#{rental._id.substring(rental._id.length - 8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Customer Info */}
                                                        <td className="p-3">
                                                            <p className="font-medium text-white">{rental.customerName}</p>
                                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <i className="fas fa-phone text-[10px] text-gray-500"></i> {rental.customerPhone}
                                                            </p>
                                                            {rental.customerEmail && (
                                                                <p className="text-[11px] text-gray-500 truncate max-w-[150px]">{rental.customerEmail}</p>
                                                            )}
                                                        </td>

                                                        {/* Booking Start Date */}
                                                        <td className="p-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5 text-white font-medium">
                                                                <i className="fas fa-calendar-alt text-gold-400 text-xs"></i>
                                                                {new Date(rental.startDate).toLocaleDateString('en-IN', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                            <span className="text-[11px] text-gray-400">Pick-up Date</span>
                                                        </td>

                                                        {/* Return Date */}
                                                        <td className="p-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                                                <i className="fas fa-undo text-amber-400 text-xs"></i>
                                                                {new Date(rental.returnDate).toLocaleDateString('en-IN', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                            {rental.actualReturnDate ? (
                                                                <span className="text-[11px] text-emerald-400">
                                                                    Returned on {new Date(rental.actualReturnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-gray-400">Expected Return</span>
                                                            )}
                                                        </td>

                                                        {/* Amount */}
                                                        <td className="p-3 whitespace-nowrap">
                                                            <p className="font-bold text-white">₹{rental.totalAmount.toLocaleString('en-IN')}</p>
                                                            <p className="text-[11px] text-gray-400">
                                                                ₹{rental.rentalPrice} + ₹{rental.securityDeposit} dep.
                                                            </p>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="p-3 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${rentalStatusColors[rental.status] || 'bg-gray-700 text-white'}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    rental.status === 'Booked' ? 'bg-amber-400' :
                                                                    rental.status === 'Active' ? 'bg-blue-400' :
                                                                    rental.status === 'Returned' ? 'bg-emerald-400' : 'bg-rose-400'
                                                                }`}></span>
                                                                {rental.status}
                                                            </span>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {/* One-click "Mark as Returned" button */}
                                                                {isOngoing && (
                                                                    <button
                                                                        onClick={() => handleRentalStatusUpdate(rental._id, 'Returned')}
                                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                                                                        title="Mark returned to make this lehenga available immediately"
                                                                    >
                                                                        <i className="fas fa-check"></i> Mark Returned
                                                                    </button>
                                                                )}

                                                                {/* Status dropdown */}
                                                                <select
                                                                    value={rental.status}
                                                                    onChange={(e) => handleRentalStatusUpdate(rental._id, e.target.value)}
                                                                    className="bg-black/50 border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold-500 cursor-pointer"
                                                                >
                                                                    {['Booked', 'Active', 'Returned', 'Cancelled'].map(st => (
                                                                        <option key={st} value={st} className="bg-gray-900 text-white">
                                                                            {st}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                {/* Delete */}
                                                                <button
                                                                    onClick={() => handleDeleteRental(rental._id)}
                                                                    className="text-red-400 hover:text-red-300 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                                                                    title="Delete Booking"
                                                                >
                                                                    <i className="fas fa-trash text-xs"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Offline Rental Booking Modal */}
                            {isOfflineRentalOpen && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <form onSubmit={handleSaveOfflineRental} className="bg-gray-900 border border-gray-700 p-6 md:p-8 rounded-2xl w-full max-w-lg relative animate-fade-in-up shadow-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setIsOfflineRentalOpen(false)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                        >
                                            <i className="fas fa-times text-lg"></i>
                                        </button>

                                        <h3 className="text-xl text-white font-bold mb-1">Book In-Store Rental</h3>
                                        <p className="text-xs text-gray-400 mb-6">Create a walk-in rental booking directly into MongoDB database</p>

                                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                            <div>
                                                <label className="text-xs text-gray-300 font-semibold mb-1 block">Select Bridal Lehenga *</label>
                                                <select
                                                    value={offlineRentalData.lehengaId}
                                                    onChange={e => setOfflineRentalData({ ...offlineRentalData, lehengaId: e.target.value })}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                >
                                                    <option value="" className="bg-gray-900 text-gray-400">Choose a Lehenga</option>
                                                    {lehengas.map(l => (
                                                        <option key={l._id} value={l._id} className="bg-gray-900 text-white">
                                                            {l.name} — ₹{l.price}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Customer Name *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Priya Sharma"
                                                        value={offlineRentalData.customerName}
                                                        onChange={e => setOfflineRentalData({ ...offlineRentalData, customerName: e.target.value })}
                                                        required
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Phone Number *</label>
                                                    <input
                                                        type="tel"
                                                        placeholder="9876543210"
                                                        value={offlineRentalData.customerPhone}
                                                        onChange={e => setOfflineRentalData({ ...offlineRentalData, customerPhone: e.target.value })}
                                                        required
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Booking Start Date *</label>
                                                    <input
                                                        type="date"
                                                        value={offlineRentalData.startDate}
                                                        onChange={e => setOfflineRentalData({ ...offlineRentalData, startDate: e.target.value })}
                                                        required
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Return Date *</label>
                                                    <input
                                                        type="date"
                                                        value={offlineRentalData.returnDate}
                                                        onChange={e => setOfflineRentalData({ ...offlineRentalData, returnDate: e.target.value })}
                                                        required
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-gray-300 font-semibold mb-1 block">Customer Email (Optional)</label>
                                                <input
                                                    type="email"
                                                    placeholder="customer@gmail.com"
                                                    value={offlineRentalData.customerEmail}
                                                    onChange={e => setOfflineRentalData({ ...offlineRentalData, customerEmail: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs text-gray-300 font-semibold mb-1 block">Notes / Alteration Details</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Fitting size, deposit cash received, etc."
                                                    value={offlineRentalData.notes}
                                                    onChange={e => setOfflineRentalData({ ...offlineRentalData, notes: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-gold-500 outline-none resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => setIsOfflineRentalOpen(false)}
                                                className="w-1/3 py-2.5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/5 text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="w-2/3 py-2.5 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold rounded-lg text-sm transition-all shadow-lg"
                                            >
                                                Confirm Booking
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
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

                                            {/* Image Upload / URL */}
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-sm font-medium">Lehenga Images (Up to 8)</label>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(editingLehenga?.images || (editingLehenga?.image ? [editingLehenga?.image] : [])).map((imgUrl: string, idx: number) => (
                                                            <div key={idx} className="relative w-20 h-20 bg-white/5 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shrink-0 group">
                                                                <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                <button type="button" onClick={() => {
                                                                    const currentImages = editingLehenga?.images || (editingLehenga?.image ? [editingLehenga?.image] : []);
                                                                    const newImages = currentImages.filter((_: any, i: number) => i !== idx);
                                                                    setEditingLehenga({ ...editingLehenga, images: newImages, image: newImages[0] || '' });
                                                                }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {(!editingLehenga?.images || editingLehenga?.images.length < 8) && (
                                                            <div className="w-20 h-20 bg-white/5 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shrink-0 text-gray-500">
                                                                <i className="fas fa-image"></i>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Paste Image URL (or upload below) and hit Enter"
                                                            className="w-full bg-white/5 p-2 rounded text-white text-xs border border-white/10 focus:border-gold-500 outline-none"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const val = (e.target as HTMLInputElement).value;
                                                                    if (val) {
                                                                        const currentImages = editingLehenga?.images || (editingLehenga?.image ? [editingLehenga?.image] : []);
                                                                        if (currentImages.length < 8) {
                                                                            const newImages = [...currentImages, val];
                                                                            setEditingLehenga({ ...editingLehenga, images: newImages, image: newImages[0] });
                                                                        } else {
                                                                            alert("Maximum 8 images allowed.");
                                                                        }
                                                                        (e.target as HTMLInputElement).value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, 'lehenga')}
                                                                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gold-500 file:text-black hover:file:bg-gold-400 cursor-pointer"
                                                            />
                                                            {imageUploading && <span className="text-xs text-gold-400 font-semibold animate-pulse whitespace-nowrap">Optimizing...</span>}
                                                        </div>
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

                    {/* PARLOR BOOKINGS */}
                    {activeTab === 'parlor' && (
                        <div className="space-y-4">
                            <h2 className="text-xl text-white font-bold mb-4">Parlor Appointments</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-xs uppercase">
                                        <tr>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Service</th>
                                            <th className="p-3">Date & Time</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {appointments.map((appt, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="p-3">
                                                    <div className="font-medium text-white">{appt.customerName}</div>
                                                    <div className="text-xs text-gray-400">{appt.customerPhone}</div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium">{appt.serviceName}</div>
                                                    {appt.notes && <div className="text-xs text-gray-500 max-w-[200px] truncate">{appt.notes}</div>}
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <div>{appt.date}</div>
                                                    <div className="text-xs text-gold-500">{appt.slot}</div>
                                                </td>
                                                <td className="p-3 font-semibold">₹{appt.price.toLocaleString()}</td>
                                                <td className="p-3">
                                                    <select
                                                        value={appt.status}
                                                        onChange={async (e) => {
                                                            try {
                                                                const res = await fetch(`/api/appointments/${appt._id}/status`, {
                                                                    method: 'PUT',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${getAuthToken()}`
                                                                    },
                                                                    body: JSON.stringify({ status: e.target.value })
                                                                });
                                                                if (res.ok) fetchData();
                                                            } catch (err) {
                                                                console.error("Failed to update status", err);
                                                            }
                                                        }}
                                                        className="bg-black/50 border border-white/20 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-gold-500 cursor-pointer"
                                                    >
                                                        {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
                                                            <option key={s} value={s} className="bg-midnight-900">{s}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Cancel appointment for ${appt.customerName}?`)) {
                                                                try {
                                                                    await fetch(`/api/appointments/${appt._id}`, {
                                                                        method: 'DELETE',
                                                                        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                                                                    });
                                                                    fetchData();
                                                                } catch (err) {
                                                                    console.error("Delete failed", err);
                                                                }
                                                            }
                                                        }}
                                                        className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10 transition-colors"
                                                        title="Delete Appointment"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {appointments.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                                    No appointments found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PARLOR SERVICES */}
                    {activeTab === 'parlorServices' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl text-white font-bold">Parlor Services</h2>
                                <button
                                    onClick={() => {
                                        setEditingService({ name: '', duration: '', price: 0, desc: '', badge: '' });
                                        setIsServiceFormOpen(true);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold rounded-lg hover:shadow-lg transition-all"
                                >
                                    <i className="fas fa-plus mr-2"></i> Add Service
                                </button>
                            </div>

                            {isServiceFormOpen && (
                                <div className="bg-gray-800 p-6 rounded-xl mb-6 border border-gray-700 relative">
                                    <button
                                        onClick={() => { setIsServiceFormOpen(false); setEditingService(null); }}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <h3 className="text-lg font-bold text-white mb-4">
                                        {editingService?._id ? 'Edit Service' : 'Add New Service'}
                                    </h3>
                                    <form onSubmit={handleSaveService}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="Service Name"
                                                className="bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingService?.name || ''}
                                                onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="Duration (e.g., '2 hrs')"
                                                className="bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingService?.duration || ''}
                                                onChange={e => setEditingService({ ...editingService, duration: e.target.value })}
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price (₹)"
                                                className="bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingService?.price || 0}
                                                onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })}
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="Badge (Optional, e.g., 'Popular')"
                                                className="bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none"
                                                value={editingService?.badge || ''}
                                                onChange={e => setEditingService({ ...editingService, badge: e.target.value })}
                                            />
                                        </div>
                                        <textarea
                                            placeholder="Description"
                                            className="w-full bg-white/5 p-3 rounded text-white border border-white/10 focus:border-gold-500 outline-none min-h-[80px] mt-4"
                                            value={editingService?.desc || ''}
                                            onChange={e => setEditingService({ ...editingService, desc: e.target.value })}
                                            required
                                        />
                                        <button type="submit" className="w-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold py-3 mt-6 rounded-lg hover:shadow-lg transition-all">
                                            Save Service
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-xs uppercase">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Duration</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">Badge</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {parlorServices.map(srv => (
                                            <tr key={srv._id} className="hover:bg-white/5">
                                                <td className="p-3 font-medium text-white">{srv.name}</td>
                                                <td className="p-3 text-sm">{srv.duration}</td>
                                                <td className="p-3 font-bold text-gold-500">₹{srv.price.toLocaleString()}</td>
                                                <td className="p-3 text-xs">{srv.badge || '-'}</td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => { setEditingService(srv); setIsServiceFormOpen(true); }} className="text-blue-400 hover:text-blue-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-edit"></i></button>
                                                    <button onClick={() => handleDeleteService(srv._id)} className="text-red-400 hover:text-red-300 w-8 h-8 rounded hover:bg-white/10"><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {parlorServices.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                                    No parlor services found. Add one to get started.
                                                </td>
                                            </tr>
                                        )}
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
                                                <img src={item.image || (item as any).product?.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800'} alt={item.name} onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800'; }} className="w-16 h-16 rounded object-cover bg-gray-800" />
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
