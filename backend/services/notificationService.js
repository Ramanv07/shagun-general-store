/**
 * notificationService.js
 * Instant Admin Notification System for Shagun Mart
 * 
 * 1. ntfy.sh: Real-time phone push notification (lockscreen pop-up + loud chime)
 * 2. WhatsApp: Direct message to admin via CallMeBot (if API key provided)
 */

export async function sendAdminOrderNotification(order) {
  try {
    const adminPhone = process.env.ADMIN_WHATSAPP || '918827259023';
    const ntfyTopic = process.env.NTFY_TOPIC || 'shagun-mart-orders-8827';
    const callMeBotKey = process.env.CALLMEBOT_API_KEY;

    const orderId = order._id?.toString() || 'N/A';
    const customerName = order.shippingAddress?.fullName || 'Customer';
    const customerPhone = order.shippingAddress?.mobile || 'N/A';
    const city = order.shippingAddress?.city || 'Bamitha';
    const total = order.totalAmount?.toLocaleString('en-IN') || '0';
    const payment = order.paymentMethod || 'COD';

    const itemsSummary = (order.items || [])
      .map(item => `• ${item.name} x ${item.quantity || 1} (₹${(item.price || 0).toLocaleString('en-IN')})`)
      .join('\n');

    // ==========================================
    // 1. NTFY.SH PUSH NOTIFICATION (Pop-up on phone)
    // ==========================================
    const ntfyTitle = `🛍️ New Order: ₹${total} by ${customerName}`;
    const ntfyBody = `Order #${orderId}\n` +
      `📞 Phone: ${customerPhone}\n` +
      `📍 City: ${city}\n` +
      `💳 Payment: ${payment}\n\n` +
      `Items:\n${itemsSummary}`;

    try {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: {
          'Title': ntfyTitle,
          'Priority': 'urgent',
          'Tags': 'shopping_bags,moneybag,package',
          'Click': 'https://shagun-general-store.vercel.app/admin'
        },
        body: ntfyBody
      });
      console.log(`[Notification] ntfy push sent to topic "${ntfyTopic}" for order #${orderId}`);
    } catch (ntfyErr) {
      console.error('[Notification] ntfy push error:', ntfyErr.message);
    }

    // ==========================================
    // 2. WHATSAPP MESSAGE VIA CALLMEBOT (if key set)
    // ==========================================
    if (callMeBotKey) {
      try {
        const waText = `🛍️ *New Shagun Mart Order!*\n\n` +
          `*Order ID:* #${orderId}\n` +
          `*Customer:* ${customerName}\n` +
          `*Phone:* ${customerPhone}\n` +
          `*City:* ${city}\n` +
          `*Total:* ₹${total} (${payment})\n\n` +
          `*Items:*\n${itemsSummary}\n\n` +
          `👉 *Admin Portal:* https://shagun-general-store.vercel.app/admin`;

        const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${encodeURIComponent(waText)}&apikey=${callMeBotKey}`;
        await fetch(waUrl);
        console.log(`[Notification] CallMeBot WhatsApp sent to ${adminPhone} for order #${orderId}`);
      } catch (waErr) {
        console.error('[Notification] CallMeBot WhatsApp error:', waErr.message);
      }
    }
  } catch (err) {
    console.error('[Notification] sendAdminOrderNotification error:', err.message);
  }
}
