"use client";

import React from "react";

function toMegaStream(url: string) {
  return url.startsWith("https://mega.nz/")
    ? `/api/mega-stream?url=${encodeURIComponent(url)}`
    : url;
}

export default function VideoGrid({ videos }: { videos?: string[] }) {
  if (!videos?.length) return null;
  return (
    <div className="grid  gap-2">
      {videos.slice(0, 4).map((src, i) => (
        <video
          key={i}
          src={toMegaStream(src)}
          controls
          className="w-full h-64 rounded-2xl object-cover"
        />
      ))}
    </div>
  );
}
