'use client';
import Script from 'next/script';

export default function OneSignalScript() {
  const appId = String(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '').trim();
  return (
    <>
      <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
      <Script id="onesignal-init" strategy="afterInteractive">
        {`
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          (function(){
            if (window.__OS_initialized) return;
            OneSignalDeferred.push(async function(OneSignal) {
              try {
                if (window.__OS_initialized) return;
                await OneSignal.init({
                  appId: "${appId}",
                  allowLocalhostAsSecureOrigin: true,
                  serviceWorkerPath: "/OneSignalSDKWorker.js",
                  serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js"
                });
                window.__OS_initialized = true;
              } catch {}
            });
          })();
        `}
      </Script>
    </>
  );
}
