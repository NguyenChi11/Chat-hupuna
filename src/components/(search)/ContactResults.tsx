import Image from 'next/image';
import React from 'react';

interface PhonebookContact {
  _id: string;
  name: string;
  avatar?: string;
  isGroup?: boolean;
}

interface HighlightTextProps {
  text: string;
  keyword: string;
}

function HighlightText({ text, keyword }: HighlightTextProps) {
  if (!keyword.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

interface ContactResultsProps {
  contacts: PhonebookContact[];
  searchTerm: string;
  onSelectContact: (phonebook: PhonebookContact) => void;
}

export default function ContactResults({ contacts, searchTerm, onSelectContact }: ContactResultsProps) {
  if (contacts.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        <div className="w-1 h-4 bg-blue-500 rounded-full" />
        Liên hệ
        <span className="text-xs text-gray-500 font-normal">({contacts.length})</span>
      </h4>
      <div className="space-y-1">
        {contacts.map((phonebook) => (
          <div
            key={phonebook._id}
            onClick={() => onSelectContact(phonebook)}
            className="flex items-center p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all group"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {phonebook.avatar ? (
                  <Image src={phonebook.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  phonebook.name?.charAt(0).toUpperCase()
                )}
              </div>
              {phonebook.isGroup && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 ml-3">
              <p className="font-medium text-gray-800 truncate">
                <HighlightText text={phonebook.name} keyword={searchTerm} />
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">{phonebook.isGroup ? 'Nhóm' : 'Liên hệ'}</p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </section>
  );
}
