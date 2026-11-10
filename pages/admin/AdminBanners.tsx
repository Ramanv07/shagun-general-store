import React, { useState, useEffect } from 'react';
import { resizeImage } from '../../utils/imageResizer';

interface BannerItem {
  _id: string;
  title: string;
  imageUrl: string;
  placement: string[];
  sortOrder: number;
  active: boolean;
  startAt?: string | null;
  endAt?: string | null;
  target?: {
    type: 'none' | 'category' | 'product' | 'brand' | 'offers';
    value: string;
  };
}

interface AdminBannersProps {
  token: string;
}

export const AdminBanners: React.FC<AdminBannersProps> = ({ token }) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    placement: ['web_home', 'app_home'],
    sortOrder: 0,
    active: true,
    startAt: '',
    endAt: '',
    targetType: 'none',
    targetValue: ''
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/banners/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load banners');
      const data = await res.json();
      setBanners(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      imageUrl: '',
      placement: ['web_home', 'app_home'],
      sortOrder: banners.length,
      active: true,
      startAt: '',
      endAt: '',
      targetType: 'none',
      targetValue: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b);
    setFormData({
      title: b.title || '',
      imageUrl: b.imageUrl,
      placement: b.placement || ['web_home'],
      sortOrder: b.sortOrder || 0,
      active: b.active,
      startAt: b.startAt ? b.startAt.slice(0, 16) : '',
      endAt: b.endAt ? b.endAt.slice(0, 16) : '',
      targetType: b.target?.type || 'none',
      targetValue: b.target?.value || ''
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      alert('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    try {
      setUploading(true);
      const processedFile = await resizeImage(file, 1600, 0.8);
      if (processedFile.size > 4 * 1024 * 1024) {
        alert('Processed image size exceeds 4MB limit.');
        return;
      }
      const data = new FormData();
      data.append('image', processedFile);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Upload failed');
      setFormData(prev => ({ ...prev, imageUrl: result.url || result.imageUrl }));
    } catch (err: any) {
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.imageUrl) {
      setError('Banner image is required.');
      return;
    }

    const payload = {
      title: formData.title,
      imageUrl: formData.imageUrl,
      placement: formData.placement,
      sortOrder: Number(formData.sortOrder) || 0,
      active: formData.active,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
      endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
      target: {
        type: formData.targetType,
        value: formData.targetValue.trim()
      }
    };

    try {
      const url = editingBanner ? `/api/banners/${editingBanner._id}` : '/api/banners';
      const method = editingBanner ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save banner');

      setSuccess(editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!');
      setIsModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      setSuccess('Banner deleted');
      fetchBanners();
    } catch (err: any) {
      setError(err.message || 'Failed to delete banner');
    }
  };

  const handleToggleActive = async (b: BannerItem) => {
    try {
      const res = await fetch(`/api/banners/${b._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ active: !b.active })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Toggle failed');
      }
      fetchBanners();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    const reordered = newBanners.map((item, idx) => ({ id: item._id, sortOrder: idx }));

    try {
      const res = await fetch('/api/banners/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: reordered })
      });
      if (!res.ok) throw new Error('Reorder failed');
      fetchBanners();
    } catch (err: any) {
      alert(err.message || 'Error saving order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Promotional Banners</h2>
          <p className="text-xs text-gray-500 mt-1">Manage carousel posters across mobile and web customer storefronts (Max 10 active per placement).</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <i className="fas fa-plus text-xs" /> Add Banner
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <i className="fas fa-exclamation-circle" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
          <i className="fas fa-check-circle" /> {success}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-xs">
          <i className="fas fa-spinner fa-spin text-lg mb-2" />
          <p>Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-gray-100 text-gray-500 text-xs">
          <i className="fas fa-images text-2xl text-gray-300 mb-2 block" />
          No promotional banners configured yet. Click "Add Banner" to upload one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b, idx) => (
            <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative aspect-16/9 bg-gray-100">
                  <img src={b.imageUrl} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${b.active ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {b.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">{b.title || 'Untitled Banner'}</h3>
                    <span className="text-[11px] font-mono text-gray-400">Order #{b.sortOrder}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {b.placement.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Target: <span className="font-semibold text-gray-700">{b.target?.type || 'none'}</span>
                    {b.target?.value ? ` (${b.target.value})` : ''}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveOrder(idx, 'up')}
                    className="p-1.5 text-gray-600 hover:text-black disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <i className="fas fa-arrow-up text-xs" />
                  </button>
                  <button
                    disabled={idx === banners.length - 1}
                    onClick={() => handleMoveOrder(idx, 'down')}
                    className="p-1.5 text-gray-600 hover:text-black disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <i className="fas fa-arrow-down text-xs" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(b)}
                    className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer"
                  >
                    {b.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditModal(b)}
                    className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">{editingBanner ? 'Edit Banner' : 'Create Banner'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Title (Optional, max 80 chars)</label>
                <input
                  type="text"
                  maxLength={80}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Wedding Season Specials"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Banner Image (Cloudinary HTTPS)</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl mb-2 font-mono text-[11px]"
                  required
                />
                <label className="inline-block px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg cursor-pointer">
                  {uploading ? 'Uploading...' : 'Upload Image File (JPEG/PNG/WebP, <5MB)'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Placement</label>
                <div className="flex items-center gap-4">
                  {['web_home', 'app_home', 'offers'].map(p => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.placement.includes(p)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({ ...formData, placement: [...formData.placement, p] });
                          } else {
                            setFormData({ ...formData, placement: formData.placement.filter(x => x !== p) });
                          }
                        }}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Action</label>
                  <select
                    value={formData.targetType}
                    onChange={e => setFormData({ ...formData, targetType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="none">None (Not Tappable)</option>
                    <option value="category">Category</option>
                    <option value="product">Product</option>
                    <option value="brand">Brand</option>
                    <option value="offers">Offers Screen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Target Value</label>
                  <input
                    type="text"
                    value={formData.targetValue}
                    onChange={e => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="e.g. Cosmetics or Product ID"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Start At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={e => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">End At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={e => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="activeCheck" className="text-gray-700 font-medium cursor-pointer">Banner is active</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold"
                >
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

