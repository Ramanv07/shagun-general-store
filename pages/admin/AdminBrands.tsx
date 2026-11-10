import React, { useState, useEffect } from 'react';

interface Brand {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    active: boolean;
    createdAt?: string;
}

interface AdminBrandsProps {
    token: string | null;
}

export const AdminBrands: React.FC<AdminBrandsProps> = ({ token }) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Partial<Brand> | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/brands/admin', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setBrands(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Fetch brands failed:', err);
            setError('Failed to load brands. Make sure you are logged in as admin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, [token]);

    const handleOpenCreate = () => {
        setEditingBrand({
            name: '',
            slug: '',
            description: '',
            logo: '',
            active: true
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (brand: Brand) => {
        setEditingBrand({ ...brand });
        setIsFormOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5 MB');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            const uploadedUrl = data.url || (data.urls && data.urls[0]);
            if (uploadedUrl) {
                setEditingBrand(prev => (prev ? { ...prev, logo: uploadedUrl } : null));
            }
        } catch (err) {
            console.error('Logo upload error:', err);
            alert('Failed to upload logo image');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBrand || !editingBrand.name?.trim()) {
            alert('Brand name is required');
            return;
        }

        try {
            setSubmitting(true);
            const url = editingBrand._id ? `/api/brands/${editingBrand._id}` : '/api/brands';
            const method = editingBrand._id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(editingBrand)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || `Failed with status ${res.status}`);
            }

            setIsFormOpen(false);
            setEditingBrand(null);
            fetchBrands();
        } catch (err: any) {
            console.error('Save brand error:', err);
            alert(err.message || 'Error saving brand');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete brand "${name}"? If products use it, it will be deactivated instead.`)) return;

        try {
            const res = await fetch(`/api/brands/${id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to delete');
            alert(data.message || 'Brand processed successfully');
            fetchBrands();
        } catch (err: any) {
            console.error('Delete brand error:', err);
            alert(err.message || 'Error deleting brand');
        }
    };

    const handleToggleActive = async (brand: Brand) => {
        try {
            const res = await fetch(`/api/brands/${brand._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ active: !brand.active })
            });
            if (!res.ok) throw new Error('Update failed');
            fetchBrands();
        } catch (err) {
            alert('Failed to update brand status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>✨</span> Brands Management
                    </h2>
                    <p className="text-sm text-gray-400">
                        Manage store brands. Active brands with products appear in "Brands You Love".
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow transition flex items-center gap-2"
                >
                    <i className="fas fa-plus"></i> Add New Brand
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-400">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i> Loading brands...
                </div>
            ) : brands.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-xl border border-white/10">
                    <i className="fas fa-tags text-3xl mb-2 block text-gray-500"></i>
                    No brands found. Click "Add New Brand" to create one.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300 text-sm">
                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                            <tr>
                                <th className="p-3">Logo</th>
                                <th className="p-3">Brand Name</th>
                                <th className="p-3">Slug</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {brands.map(brand => (
                                <tr key={brand._id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        {brand.logo ? (
                                            <img
                                                src={brand.logo}
                                                alt={brand.name}
                                                className="w-12 h-12 object-contain rounded bg-white/10 p-1 border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-gray-500 text-xs border border-white/10">
                                                No Logo
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 font-semibold text-white">{brand.name}</td>
                                    <td className="p-3 text-gray-400 font-mono text-xs">{brand.slug}</td>
                                    <td className="p-3 text-gray-400 text-xs max-w-xs truncate">{brand.description || '-'}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => handleToggleActive(brand)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                                                brand.active
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'
                                            }`}
                                        >
                                            {brand.active ? '● Active' : '○ Inactive'}
                                        </button>
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleOpenEdit(brand)}
                                            className="px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand._id, brand.name)}
                                            className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isFormOpen && editingBrand && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setIsFormOpen(false)}
                >
                    <div
                        className="bg-midnight-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-lg font-bold text-white">
                                {editingBrand._id ? 'Edit Brand' : 'Add Brand'}
                            </h3>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingBrand.name || ''}
                                    onChange={e => {
                                        const name = e.target.value;
                                        setEditingBrand(prev => {
                                            if (!prev) return null;
                                            // auto slugify if slug is empty or matched old name
                                            const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                            return { ...prev, name, slug: prev._id ? prev.slug : autoSlug };
                                        });
                                    }}
                                    placeholder="e.g. Lakmé, Maybelline"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-rose-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    value={editingBrand.slug || ''}
                                    onChange={e => setEditingBrand(prev => (prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } : null))}
                                    placeholder="e.g. lakme"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono focus:border-rose-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingBrand.description || ''}
                                    onChange={e => setEditingBrand(prev => (prev ? { ...prev, description: e.target.value } : null))}
                                    placeholder="Short summary of the brand..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-rose-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                                    Logo Image
                                </label>
                                <div className="flex items-center gap-3">
                                    {editingBrand.logo ? (
                                        <img
                                            src={editingBrand.logo}
                                            alt="Preview"
                                            className="w-14 h-14 object-contain rounded bg-white/10 p-1 border border-white/10"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center text-gray-500 text-xs border border-white/10">
                                            No logo
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                        />
                                        <input
                                            type="url"
                                            value={editingBrand.logo || ''}
                                            onChange={e => setEditingBrand(prev => (prev ? { ...prev, logo: e.target.value } : null))}
                                            placeholder="Or paste Cloudinary URL"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-rose-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="brandActive"
                                    checked={editingBrand.active ?? true}
                                    onChange={e => setEditingBrand(prev => (prev ? { ...prev, active: e.target.checked } : null))}
                                    className="rounded bg-white/5 border-white/10 text-rose-600 focus:ring-0"
                                />
                                <label htmlFor="brandActive" className="text-sm text-gray-300">
                                    Active (visible in app and store filters)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
                                >
                                    {submitting ? 'Saving...' : 'Save Brand'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

