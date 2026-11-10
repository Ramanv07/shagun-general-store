import React, { useState, useEffect } from 'react';

interface CouponItem {
  _id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  startAt?: string | null;
  endAt?: string | null;
  usageLimitTotal?: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  active: boolean;
  isPublic: boolean;
  description?: string;
  createdAt: string;
}

interface AdminCouponsProps {
  token: string;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({ token }) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [selectedRedemptions, setSelectedRedemptions] = useState<any[] | null>(null);
  const [redemptionsModalOpen, setRedemptionsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'flat',
    value: 10,
    maxDiscount: '',
    minOrderAmount: 0,
    startAt: '',
    endAt: '',
    usageLimitTotal: '',
    usageLimitPerUser: 1,
    active: true,
    isPublic: false,
    description: ''
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/coupons/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load coupons');
      const data = await res.json();
      setCoupons(data);
    } catch (err: any) {
      setError(err.message || 'Error loading coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'percent',
      value: 10,
      maxDiscount: '',
      minOrderAmount: 0,
      startAt: '',
      endAt: '',
      usageLimitTotal: '',
      usageLimitPerUser: 1,
      active: true,
      isPublic: false,
      description: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: CouponItem) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      type: c.type,
      value: c.value,
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      minOrderAmount: c.minOrderAmount || 0,
      startAt: c.startAt ? c.startAt.slice(0, 16) : '',
      endAt: c.endAt ? c.endAt.slice(0, 16) : '',
      usageLimitTotal: c.usageLimitTotal ? String(c.usageLimitTotal) : '',
      usageLimitPerUser: c.usageLimitPerUser || 1,
      active: c.active,
      isPublic: c.isPublic,
      description: c.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      code: formData.code.toUpperCase().trim(),
      type: formData.type,
      value: Number(formData.value),
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
      endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
      usageLimitTotal: formData.usageLimitTotal ? Number(formData.usageLimitTotal) : null,
      usageLimitPerUser: Number(formData.usageLimitPerUser) || 1,
      active: formData.active,
      isPublic: formData.isPublic,
      description: formData.description.trim()
    };

    try {
      const url = editingCoupon ? `/api/coupons/${editingCoupon._id}` : '/api/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save coupon');

      setSuccess(editingCoupon ? 'Coupon updated!' : 'Coupon created!');
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    }
  };

  const handleDelete = async (c: CouponItem) => {
    const actionText = c.usedCount > 0 ? 'deactivate' : 'delete';
    if (!confirm(`Are you sure you want to ${actionText} coupon "${c.code}"?`)) return;

    try {
      const res = await fetch(`/api/coupons/${c._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      setSuccess(data.message || 'Coupon updated');
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to delete/deactivate coupon');
    }
  };

  const viewRedemptions = async (couponId: string) => {
    try {
      const res = await fetch(`/api/coupons/${couponId}/redemptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load usage history');
      const data = await res.json();
      setSelectedRedemptions(data);
      setRedemptionsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error loading redemptions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Discount Coupons</h2>
          <p className="text-xs text-gray-500 mt-1">Create and manage promo codes with authoritative server-side limits.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <i className="fas fa-plus text-xs" /> Create Coupon
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
          <p>Loading coupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-gray-100 text-gray-500 text-xs">
          <i className="fas fa-tags text-2xl text-gray-300 mb-2 block" />
          No discount coupons created yet. Click "Create Coupon" to add one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-900 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min Order</th>
                  <th className="py-3 px-4">Used / Limit</th>
                  <th className="py-3 px-4">Public</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {c.code}
                      {c.description && <span className="block font-sans font-normal text-[10px] text-gray-400 truncate max-w-xs">{c.description}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {c.type === 'percent' ? `${c.value}% (Max ₹${c.maxDiscount || '∞'})` : `₹${c.value} Flat`}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">₹{c.minOrderAmount}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => viewRedemptions(c._id)}
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                        title="View redemptions list"
                      >
                        {c.usedCount} / {c.usageLimitTotal || '∞'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.isPublic ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Public</span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">Private</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className={`px-2.5 py-1 text-xs rounded-lg cursor-pointer ${c.usedCount > 0 ? 'text-amber-600 hover:bg-amber-50' : 'text-red-600 hover:bg-red-50'}`}
                      >
                        {c.usedCount > 0 ? (c.active ? 'Deactivate' : 'Deleted') : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in border border-gray-100 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Coupon Code (Alphanumeric)</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.code}
                  disabled={Boolean(editingCoupon)}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE20"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono uppercase font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Discount Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Value ({formData.type === 'percent' ? '%' : '₹'})</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={e => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Max Discount (₹, % only)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxDiscount}
                    onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="Optional cap"
                    disabled={formData.type !== 'percent'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimitTotal}
                    onChange={e => setFormData({ ...formData, usageLimitTotal: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimitPerUser}
                    onChange={e => setFormData({ ...formData, usageLimitPerUser: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Description (Offers display text)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 20% off on all bridal cosmetics above ₹500"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-700 font-medium">Coupon is active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-700 font-medium">Show in public Offers</span>
                </label>
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
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemptions List Modal */}
      {redemptionsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in border border-gray-100 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Recent Redemptions</h3>
              <button onClick={() => setRedemptionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times" />
              </button>
            </div>

            {selectedRedemptions && selectedRedemptions.length === 0 ? (
              <p className="text-center py-6 text-gray-400">No redemptions yet for this coupon.</p>
            ) : (
              <div className="space-y-3">
                {selectedRedemptions?.map((r, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{r.user?.name || 'Customer'}</p>
                      <p className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">₹{r.amount} Saved</span>
                      <p className="text-[10px] text-gray-500">Order: ₹{r.order?.totalAmount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

