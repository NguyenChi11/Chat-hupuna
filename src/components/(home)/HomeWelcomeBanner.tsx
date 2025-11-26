'use client';

import 'swiper/css';
import 'swiper/css/pagination';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

import { banners } from '@/data/dataBanner';
import { User } from '@/types/User';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';

interface HomeWelcomeBannerProps {
  currentUser: User;
}

export default function HomeWelcomeBanner({ currentUser }: HomeWelcomeBannerProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 overflow-auto">
      <div className="w-full px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-[1.4375rem] text-black">
            Chào mừng <span className="font-bold text-blue-600">{currentUser.name}</span> đến với Zalo PC!
          </h1>
        </div>
        <Swiper
          modules={[Autoplay, Pagination]}
          slidesPerView={1}
          autoplay={{ delay: 2500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="w-full max-w-[31.25rem]"
        >
          {banners.map((banner, index) => (
            <SwiperSlide key={index}>
              <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-50">
                <Image
                  width={400}
                  height={400}
                  src={getProxyUrl(banner.image)}
                  alt={banner.title}
                  className="w-full max-w-[25rem] h-auto mb-4"
                />
                <h2 className="text-lg text-blue-500 font-semibold mb-2">{banner.title}</h2>
                <p className="text-gray-600 text-sm mb-4">{banner.description}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </main>
  );
}
