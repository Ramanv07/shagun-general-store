/**
 * notificationService.js
 * Comprehensive Notification System for Shagun Mart
 * 
 * 1. Admin Notifications (ntfy.sh + WhatsApp)
 * 2. Customer Push Notifications (Expo Push Notification API - Lockscreen Popups like Flipkart)
 * 3. Broadcast Marketing Notifications ("Sale is Live Now!")
 */

import User from '../models/User.js';

/**
 * Send Lockscreen Push Notifications to mobile devices via Expo Push Service
 * Supports single token or array of tokens
 */
export async function sendExpoPushNotifications(tokens, { title, body, data = {} }) {
  if (!tokens) return;
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(
    t => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
  );

  if (tokenList.length === 0) return;

  const messages = tokenList.map(to => ({
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log(`[PushNotification] Dispatched ${messages.length} push notifications:`, result?.data?.[0]?.status || 'sent');
    return result;
  } catch (err) {
    console.error('[PushNotification] Error sending Expo push notifications:', err.message);
  }
}

/**
 * Send Customer Notification for order updates (Placed, Packed, Out for Delivery, Delivered)
 */
export async function sendCustomerOrderNotification(order, statusEvent = 'Placed') {
  try {
    const orderId = order._id?.toString() || 'N/A';
    const shortId = orderId.slice(-6).toUpperCase();
    const total = order.totalAmount?.toLocaleString('en-IN') || '0';

    let title = '';
    let body = '';

    switch (statusEvent) {
      case 'Placed':
        title = `🎉 Order Confirmed: #${shortId}`;
        body = `Your order of ₹${total} has been placed successfully! We are preparing your items.`;
        break;
      case 'Packed':
        title = `📦 Order Packed: #${shortId}`;
        body = `Your Shagun Mart order has been packed and is ready for dispatch!`;
        break;
      case 'Out for Delivery':
        title = `🚴 Out for Delivery: #${shortId}`;
        body = `Your order is out for delivery and will arrive shortly!`;
        break;
      case 'Delivered':
        title = `✅ Order Delivered: #${shortId}`;
        body = `Your order has been delivered! Thank you for choosing Shagun Mart.`;
        break;
      case 'Cancelled':
        title = `❌ Order Cancelled: #${shortId}`;
        body = `Your order #${shortId} has been cancelled.`;
        break;
      default:
        title = `Order Update: #${shortId}`;
        body = `Your order status changed to: ${statusEvent}`;
    }

    // 1. Locate user in MongoDB
    let userDoc = null;
    if (order.user) {
      userDoc = await User.findById(order.user._id || order.user);
    }
    if (!userDoc && order.shippingAddress?.mobile) {
      userDoc = await User.findOne({ phone: order.shippingAddress.mobile });
    }

    if (userDoc) {
      // A. Save in user's in-app notification inbox
      if (!userDoc.notifications) userDoc.notifications = [];
      userDoc.notifications.unshift({
        title,
        body,
        type: 'order',
        read: false,
        createdAt: new Date(),
        data: { orderId }
      });
      if (userDoc.notifications.length > 50) {
        userDoc.notifications = userDoc.notifications.slice(0, 50);
      }
      await userDoc.save();

      // B. Dispatch lockscreen push notification to user's devices
      if (userDoc.pushTokens && userDoc.pushTokens.length > 0) {
        await sendExpoPushNotifications(userDoc.pushTokens, {
          title,
          body,
          data: { orderId, screen: 'orders' }
        });
      }
    }
  } catch (err) {
    console.error('[CustomerNotification] Error sending customer notification:', err.message);
  }
}

/**
 * Broadcast marketing notifications to ALL customers ("Sale is Live Now!")
 */
export async function broadcastCustomerNotification({ title, body, data = {} }) {
  try {
    const usersWithTokens = await User.find({
      pushTokens: { $exists: true, $not: { $size: 0 } }
    }).select('pushTokens notifications');

    const allTokens = [];
    usersWithTokens.forEach(u => {
      if (u.pushTokens && u.pushTokens.length > 0) {
        allTokens.push(...u.pushTokens);
      }
    });

    console.log(`[BroadcastNotification] Sending to ${allTokens.length} active devices...`);

    // Dispatch Expo push
    if (allTokens.length > 0) {
      await sendExpoPushNotifications(allTokens, { title, body, data });
    }

    // Save in in-app notification inbox for all users
    await User.updateMany(
      {},
      {
        $push: {
          notifications: {
            $each: [{
              title,
              body,
              type: 'promotion',
              read: false,
              createdAt: new Date(),
              data
            }],
            $position: 0,
            $slice: 50
          }
        }
      }
    );

    return { totalSent: allTokens.length };
  } catch (err) {
    console.error('[BroadcastNotification] Error broadcasting:', err.message);
    throw err;
  }
}

/**
 * Admin Instant Notification System (ntfy.sh + WhatsApp)
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

    // 1. NTFY.SH PUSH NOTIFICATION
    const ntfyTitle = `New Order: Rs. ${total} by ${customerName}`;
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

    // 2. WHATSAPP MESSAGE VIA CALLMEBOT
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
