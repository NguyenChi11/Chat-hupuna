(() => {
  const init = async () => {
    // Tránh chạy 2 lần hoặc trong iframe chat
    if (document.getElementById('hupuna-chat-widget-container')) return;
    if (window.location.pathname.startsWith('/chat-iframe')) return;

    try {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      const me = await res.json();
      if (!(me && me.success)) return;
    } catch {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('info_user') : null;
        const u = raw ? JSON.parse(raw) : null;
        if (!(u && (u._id || u.username))) return;
      } catch {}
    }

    // Tìm script để lấy data-src, data-title
    let scriptEl = document.currentScript;
    if (!scriptEl) {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src.includes('chat-widget.js')) {
          scriptEl = scripts[i];
          break;
        }
      }
    }

    const url = new URL(scriptEl?.src || '', window.location.href);
    const origin = url.origin;
    const defaultSrc = `${origin}/chat-iframe`;

    const iframeSrc = scriptEl?.dataset.src || scriptEl?.getAttribute('data-src') || defaultSrc;
    const title = scriptEl?.dataset.title || scriptEl?.getAttribute('data-title') || 'Chat';

    // Container chính
    const container = document.createElement('div');
    container.id = 'hupuna-chat-widget-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '4.375rem',
      right: '1.25rem',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    });
    document.body.appendChild(container);

    // Wrapper iframe (widget chat)
    const iframeWrap = document.createElement('div');
    Object.assign(iframeWrap.style, {
      width: '25rem',
      maxWidth: 'calc(100vw - 48px)',
      height: '38.75rem',
      maxHeight: 'calc(100vh - 6.25rem)',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      boxShadow: '0 1.5625rem 3.75rem rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      background: '#fff',
      display: 'none',
      pointerEvents: 'auto',
      transform: 'translateY(20px)',
      opacity: '0',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2)',
    });

    const iframe = document.createElement('iframe');
    iframe.src = iframeSrc;
    iframe.title = 'Hupuna Chat Widget';
    iframe.allow = 'clipboard-write; microphone; camera';
    iframe.style = 'border:none; width:100%; height:100%; display:block;';
    iframeWrap.appendChild(iframe);

    // Nút mở chat (siêu đẹp với gradient + icon react-icons style)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Mở trò chuyện với Hupuna');
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`;

    Object.assign(btn.style, {
      width: '4rem',
      height: '4rem',
      borderRadius: '9999px',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #0ea5e9, #3b82f6, #1d4ed8)',
      color: 'white',
      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    });

    // Hiệu ứng hover cho nút
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.12) translateY(-4px)';
      btn.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.6)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1) translateY(0)';
      btn.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.5)';
    };

    // Badge thông báo (có thể bật sau)
    const badge = document.createElement('span');
    badge.textContent = '1';
    badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      font-weight: bold;
      min-width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    btn.appendChild(badge);

    // Wrap nút
    const btnWrap = document.createElement('div');
    btnWrap.style.pointerEvents = 'auto';
    btnWrap.appendChild(btn);
    Object.assign(btnWrap.style, {
      display: 'block',
      marginTop: '1.25rem',
      transform: 'translateY(0)',
      opacity: '1',
      transition: 'all 0.4s ease',
    });

    container.appendChild(iframeWrap);
    container.appendChild(btnWrap);

    // Hàm mở/đóng mượt mà
    const open = () => {
      iframeWrap.style.display = 'block';
      setTimeout(() => {
        iframeWrap.style.transform = 'translateY(0)';
        iframeWrap.style.opacity = '1';
      }, 10);
      btnWrap.style.opacity = '0';
      btnWrap.style.transform = 'translateY(20px)';
      setTimeout(() => (btnWrap.style.display = 'none'), 400);
    };

    const close = () => {
      iframeWrap.style.transform = 'translateY(20px)';
      iframeWrap.style.opacity = '0';
      setTimeout(() => (iframeWrap.style.display = 'none'), 400);
      btnWrap.style.display = 'block';
      setTimeout(() => {
        btnWrap.style.opacity = '1';
        btnWrap.style.transform = 'translateY(0)';
      }, 10);
    };

    const toggle = () => {
      if (iframeWrap.style.display === 'block') close();
      else open();
    };

    btn.addEventListener('click', open);

    // Nhận message từ iframe
    window.addEventListener('message', (e) => {
      try {
        const allowedOrigin = new URL(iframeSrc).origin;
        if (e.origin !== allowedOrigin) return;
      } catch {}

      const data = e.data;
      if (data === 'HUPUNA_WIDGET_CLOSE' || (data && data.type === 'HUPUNA_WIDGET_CLOSE')) {
        close();
      }
      if (data && data.type === 'HUPUNA_WIDGET_OPEN') open();
      if (data && data.type === 'HUPUNA_WIDGET_TOGGLE') toggle();
    });

    // Public API
    window.HupunaChatWidget = {
      open,
      close,
      toggle,
      iframe,
      button: btn,
      container,
      showNotification: (count = 1) => {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.opacity = '1';
      },
      hideNotification: () => {
        badge.style.opacity = '0';
      },
    };
  };

  // Chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
