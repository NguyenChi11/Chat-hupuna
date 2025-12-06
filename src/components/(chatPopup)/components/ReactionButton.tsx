import ICSmile from '@/components/svg/ICSmile';
import React, { useState } from 'react';

type Props = {
  isMine: boolean;
  onPick: (emoji: string) => void;
  visible?: boolean;
  className?: string;
};

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function ReactionButton({ isMine, onPick, visible, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const sideCls = isMine ? 'right-full mr-3' : 'left-full ml-3';
  const pickerSideCls = isMine ? 'left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-3/4';
  // const pickerSideCls = isMine ? 'right-0' : 'left-0 -translate-x-';

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 z-20 ${sideCls}
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        transition-opacity duration-150
        ${className}
      `}
    >
      <div className="relative inline-flex">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="w-8 h-8 hover:cursor-pointer rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-all"
          aria-label="Thả cảm xúc"
        >
          <ICSmile className='w-4 h-4'/>
        </button>
        <div
          className={`absolute ${pickerSideCls} z-50 bottom-full mb-2 flex items-center gap-1 px-3 py-2 bg-white rounded-full shadow-xl border border-gray-200 transition-all ${open ? 'opacity-100 visible pointer-events-auto scale-100' : 'opacity-0 invisible pointer-events-none scale-95'} origin-bottom whitespace-nowrap overflow-x-auto no-scrollbar max-w-[calc(100vw-64px)] sm:max-w-[20rem]`}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onPick(emoji);
              }}
              className="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:bg-gray-100 active:scale-90 transition-transform"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
