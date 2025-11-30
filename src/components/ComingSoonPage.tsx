// app/(pages)/coming-soon/page.tsx   (hoặc bất kỳ route nào bạn muốn)

'use client';

import React from 'react';
import { HiSparkles, HiRocketLaunch, HiClock, HiCheckBadge } from 'react-icons/hi2';

export default function ComingSoonPage() {
  return (
    <main className="relative h-[100vh] min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400">
      {/* Hiệu ứng nền động */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-ping" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Logo + Tên */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-5 mb-8">
            <div className="p-5 bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-xl">
                <span className="text-6xl font-black text-white">H</span>
              </div>
            </div>
            <h1 className="text-8xl font-black text-white drop-shadow-2xl tracking-tighter">Hupuna</h1>
          </div>
          <p className="text-2xl text-white/90 font-medium">Chat thế hệ mới – Kết nối mọi người</p>
        </div>

        {/* Card chính – Glassmorphism đỉnh cao */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-3xl border border-white/20 p-12">
          <div className="flex flex-col items-center">
            {/* Icon lớn */}
            <div className="p-8 bg-white/20 rounded-3xl shadow-2xl mb-8 animate-bounce">
              <HiRocketLaunch className="w-24 h-24 text-white" />
            </div>

            {/* Tiêu đề */}
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Đang được
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-white bg-clip-text text-transparent">hoàn thiện</span>
            </h2>

            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl leading-relaxed">
              Chúng tôi đang nỗ lực từng ngày để mang đến trải nghiệm chat tốt nhất cho bạn.
            </p>

            {/* Danh sách tính năng sắp ra mắt */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              {[
                { icon: HiSparkles, text: 'Giao diện đẹp như mơ' },
                { icon: HiClock, text: 'Tin nhắn siêu nhanh' },
                { icon: HiCheckBadge, text: 'Bảo mật tuyệt đối' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-4 p-6 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/20 hover:scale-105 transition-transform duration-300"
                >
                  <item.icon className="w-12 h-12 text-cyan-300" />
                  <span className="text-white font-semibold text-lg">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Nút hành động */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => (window.location.href = '/home')}
                className="px-12 py-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3"
              >
                <HiRocketLaunch className="w-7 h-7" />
                Vào ứng dụng ngay
              </button>

              <button
                onClick={() => alert('Sắp có thông báo khi ra mắt chính thức!')}
                className="px-12 py-6 bg-white/20 backdrop-blur-xl border-2 border-white/50 text-white font-bold text-xl rounded-2xl hover:bg-white/30 transition-all duration-300 active:scale-95"
              >
                Nhận thông báo khi sẵn sàng
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-white/70 text-sm">
          <p>© {new Date().getFullYear()} Hupuna – Được xây dựng với tình yêu và công nghệ</p>
        </div>
      </div>
    </main>
  );
}
