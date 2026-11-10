import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { mockApi } from '../services/mockService';
import { Order } from '../types';

export const ConfirmingPayment: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UTR submission state
  const [utr, setUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccess, setUtrSuccess] = useState<string | null>(null);
  const [utrError, setUtrError] = useState<string | null>(null);

  // Countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // QR canvas ref
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isMobileBrowser = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Fetch order data
  const fetchOrder = async (isBackground = false) => {
    if (!orderId) return;
    try {
      if (!isBackground) setLoading(true);
      const data = await mockApi.getOrderById(orderId);
      setOrder(data);
      setError(null);

      // If active pending/verifying, remember this order
      if (['pending', 'verifying', 'late_payment'].includes(data.paymentStatus || '')) {
        try {
          localStorage.setItem('shagun_active_upi_order', data._id);
        } catch {}
      } else if (data.paymentStatus === 'paid') {
        try {
          localStorage.removeItem('shagun_active_upi_order');
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Periodic polling every 60 seconds (paused when tab is hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && order?.paymentStatus !== 'paid') {
        fetchOrder(true);
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && order?.paymentStatus !== 'paid') {
        fetchOrder(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderId, order?.paymentStatus]);

  // Calculate remaining time countdown
  useEffect(() => {
    if (!order?.paymentExpiresAt) return;
    const expiresAtMs = new Date(order.paymentExpiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [order?.paymentExpiresAt]);

  // Render QR Code on canvas
  useEffect(() => {
    if (order?.upiIntent?.upiUri && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        order.upiIntent.upiUri,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#2c0810',
            light: '#ffffff'
          }
        },
        err => {
          if (err) console.error('Error generating QR in browser:', err);
        }
      );
    }
  }, [order?.upiIntent?.upiUri]);

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtrError(null);
    setUtrSuccess(null);

    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('UTR must be exactly 12 numeric digits (found on your bank debit receipt).');
      return;
    }

    try {
      setSubmittingUtr(true);
      const res = await mockApi.submitUpiUtr(orderId!, cleanUtr);
      setUtrSuccess(res.message || 'UTR submitted successfully. Your payment is now under verification.');
      setOrder(res.order);
      setUtr('');
    } catch (err: any) {
      setUtrError(err.message || 'Failed to submit UTR. Please try again.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleRetryPayment = () => {
    if (!order?.upiIntent?.upiUri) return;
    window.location.href = order.upiIntent.upiUri;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-center justify-center" style={{ backgroundColor: 'var(--clr-cream)' }}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-maroon-800">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-center justify-center" style={{ backgroundColor: 'var(--clr-cream)' }}>
        <div className="card p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-700 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-maroon-800">Order Not Found</h2>
          <p className="text-sm text-cream-700">{error || 'Unable to retrieve this order.'}</p>
          <Link to="/orders" className="btn btn-primary w-full justify-center">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = order.paymentStatus || 'pending';
  const isPaid = paymentStatus === 'paid';
  const isVerifying = paymentStatus === 'verifying';
  const isLatePayment = paymentStatus === 'late_payment';
  const isExpired = paymentStatus === 'expired' || (paymentStatus === 'pending' && remainingSeconds === 0);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen pt-28 px-4 pb-20" style={{ backgroundColor: 'var(--clr-cream)' }}>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-800">
            Confirming Your Payment
          </h1>
          <p className="text-xs sm:text-sm text-cream-700">
            Order ID: <span className="font-mono font-bold text-maroon-700">#{order.orderNumber || order._id}</span>
          </p>
        </div>

        {/* Warning Alert Banner */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5" aria-hidden="true"></i>
          <div className="text-xs text-amber-900 leading-relaxed font-medium">
            <span className="font-bold block mb-0.5">Important:</span>
            If money was debited from your bank account, enter your 12-digit UTR below. Do not pay again.
          </div>
        </div>

        {/* Main Status & Payment Card */}
        <div className="card p-6 rounded-2xl space-y-6">
          {/* Order Summary & Amount */}
          <div className="flex justify-between items-center pb-4 border-b border-cream-200">
            <div>
              <span className="text-xs text-cream-700 block">Total Payable</span>
              <span className="text-3xl font-bold text-maroon-800">
                ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-cream-700 block">Payment Status</span>
              {isPaid && (
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Paid
                </span>
              )}
              {isVerifying && (
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Verifying
                </span>
              )}
              {isLatePayment && (
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                  Late Payment
                </span>
              )}
              {isExpired && !isPaid && !isVerifying && !isLatePayment && (
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-200 text-gray-700 border border-gray-400">
                  Expired
                </span>
              )}
              {!isPaid && !isVerifying && !isLatePayment && !isExpired && (
                <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Time Remaining Timer (Only if pending) */}
          {!isPaid && !isExpired && remainingSeconds !== null && (
            <div className="bg-cream-100 border border-cream-300 p-3 rounded-xl flex items-center justify-between text-xs text-maroon-800">
              <div className="flex items-center gap-2">
                <i className="fas fa-stopwatch text-maroon-700" aria-hidden="true"></i>
                <span className="font-semibold">Payment window remaining:</span>
              </div>
              <span className="font-mono font-bold text-sm text-maroon-800">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          )}

          {/* Late payment status explanation */}
          {isLatePayment && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 space-y-1">
              <span className="font-bold block">Late Payment Submitted</span>
              <p>We received your reference and are checking it.</p>
            </div>
          )}

          {/* Expired status explanation */}
          {isExpired && !isLatePayment && !isVerifying && !isPaid && (
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 text-xs text-gray-700 space-y-1">
              <span className="font-bold block">Payment Window Expired</span>
              <p>
                The payment time limit expired. If your account was already debited, enter the 12-digit UTR below so our team can verify or initiate a refund.
              </p>
            </div>
          )}

          {/* Paid celebratory card */}
          {isPaid && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center space-y-3">
              <i className="fas fa-check-circle text-4xl text-emerald-600" aria-hidden="true"></i>
              <h3 className="text-xl font-bold text-emerald-900">Payment Verified!</h3>
              <p className="text-xs text-emerald-800">
                Your payment of ₹{order.totalAmount} has been confirmed. Your order is now being processed.
              </p>
              <div className="pt-2">
                <Link to="/orders" className="btn btn-primary inline-flex items-center gap-2 text-xs">
                  <span>View All Orders</span>
                  <i className="fas fa-arrow-right text-[10px]" aria-hidden="true"></i>
                </Link>
              </div>
            </div>
          )}

          {/* UPI Intent Display: Mobile button OR Desktop QR */}
          {!isPaid && (
            <div className="space-y-4 pt-2">
              {isMobileBrowser ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
                  >
                    <i className="fas fa-mobile-alt text-lg" aria-hidden="true"></i>
                    <span>Pay with UPI App</span>
                  </button>
                  <p className="text-center text-[11px] text-cream-600">
                    Opens installed UPI apps (GPay, PhonePe, Paytm, BHIM)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-cream-300 space-y-3">
                  <span className="text-xs font-bold text-maroon-800 uppercase tracking-wide">
                    Scan with any UPI App
                  </span>
                  <canvas ref={qrCanvasRef} className="rounded-lg shadow-sm border border-cream-200" />
                  <p className="text-center text-xs text-cream-700">
                    Use Google Pay, PhonePe, Paytm, or BHIM on your phone
                  </p>
                </div>
              )}

              {/* Retry / Re-open Payment Button */}
              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  className="text-maroon-700 hover:text-maroon-900 font-semibold underline flex items-center gap-1.5"
                >
                  <i className="fas fa-redo text-[10px]" aria-hidden="true"></i>
                  <span>Retry Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchOrder()}
                  className="text-cream-700 hover:text-maroon-800 font-semibold flex items-center gap-1.5"
                >
                  <i className="fas fa-sync-alt text-[10px]" aria-hidden="true"></i>
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>
          )}

          {/* 12-Digit UTR Submission Form */}
          {!isPaid && (
            <form onSubmit={handleUtrSubmit} className="pt-4 border-t border-cream-200 space-y-3">
              <label htmlFor="utrInput" className="text-xs font-bold text-maroon-800 block">
                Enter 12-Digit Bank UTR / Reference Number:
              </label>
              <div className="flex gap-2">
                <input
                  id="utrInput"
                  type="text"
                  maxLength={12}
                  pattern="\d{12}"
                  placeholder="e.g. 432109876543"
                  value={utr}
                  onChange={e => setUtr(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white border border-cream-300 rounded-xl px-3 py-2 text-sm text-maroon-800 font-mono tracking-wider focus:outline-none focus:border-maroon-600"
                  required
                />
                <button
                  type="submit"
                  disabled={submittingUtr || utr.length !== 12}
                  className="px-5 py-2 rounded-xl bg-maroon-700 hover:bg-maroon-600 disabled:opacity-50 text-white text-xs font-bold shadow transition"
                >
                  {submittingUtr ? 'Submitting...' : 'Submit UTR'}
                </button>
              </div>

              {utrError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {utrError}
                </div>
              )}

              {utrSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {utrSuccess}
                </div>
              )}

              {order.upiUtr && (
                <p className="text-[11px] text-cream-600">
                  Previously submitted UTR: <span className="font-mono font-bold text-maroon-700">{order.upiUtr}</span>
                  {order.upiUtrAttempts ? ` (Attempt ${order.upiUtrAttempts}/5)` : ''}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link to="/orders" className="text-xs text-maroon-700 hover:underline">
            &larr; Return to My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

