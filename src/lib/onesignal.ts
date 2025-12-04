import OneSignal from 'react-onesignal';
let __inited = false;

export async function initOneSignal() {
  if (__inited) return;
  await OneSignal.init({
    appId: String(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '').trim(),
    allowLocalhostAsSecureOrigin: true, // cho phép test localhost
    notifyButton: {
      enable: true,
      prenotify: false,
      showCredit: false,
      text: {
        'tip.state.unsubscribed': 'Subscribe to notifications',
        'tip.state.subscribed': "You're subscribed to notifications",
        'tip.state.blocked': 'You have blocked notifications',
        'message.prenotify': 'Click to subscribe to notifications',
        'message.action.subscribing': 'Subscribing...',
        'message.action.subscribed': 'Thanks for subscribing!',
        'message.action.resubscribed': 'You are subscribed to notifications',
        'message.action.unsubscribed': 'You will not receive notifications',
        'dialog.main.title': 'Manage Site Notifications',
        'dialog.main.button.subscribe': 'SUBSCRIBE',
        'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
        'dialog.blocked.title': 'Unblock Notifications',
        'dialog.blocked.message': 'Follow these instructions to allow notifications:',
      },
    },
    enable: true, // hiện nút bell để subscribe
    serviceWorkerPath: '/OneSignalSDKWorker.js',
    serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
  });
  __inited = true;
}

// Hàm đăng ký nhận thông báo
export async function subscribeNotification() {
  const permission = await OneSignal.Notifications.requestPermission();
  return permission;
}

// Lấy user ID (player ID)
export async function getUserId() {
  const userId = await OneSignal.User.PushSubscription.id;
  return userId;
}

// Thêm tag cho user (để gửi targeted notification)
export async function addUserTags(tags: Record<string, string>) {
  await OneSignal.User.addTags(tags);
}

export async function loginOneSignal(externalId: string) {
  try {
    await OneSignal.login(externalId);
  } catch {}
}

export async function ensureSubscribed() {
  try {
    const id = await OneSignal.User.PushSubscription.id;
    if (id) return id;
    await OneSignal.Notifications.requestPermission();
    for (let i = 0; i < 5; i++) {
      const cur = await OneSignal.User.PushSubscription.id;
      if (cur) return cur;
      await new Promise((r) => setTimeout(r, 800));
    }
    return await OneSignal.User.PushSubscription.id;
  } catch {
    return null;
  }
}

export async function waitForOneSignalReady() {
  const max = 30;
  for (let i = 0; i < max; i++) {
    if (typeof window !== 'undefined' && (window as { OneSignal?: unknown }).OneSignal) return;
    await new Promise((r) => setTimeout(r, 200));
  }
}
