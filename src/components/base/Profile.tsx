// AccountInfoModal.tsx
import { User } from '../../types/User';
import React from 'react';

interface AccountInfoModalProps {
  show: boolean;
  onClose: () => void;
  user: User;
  iconUpdateUrl?: string;
}

const AccountInfoModal: React.FC<AccountInfoModalProps> = ({ show, onClose, user }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <h2 className="text-lg font-semibold text-gray-800"> </h2>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-800 text-xl font-bold">
            ×
          </button>
        </div>

        {/* User Info */}
        <div className="mt-4 space-y-2 text-gray-700">
          <div>
            <span className="font-medium">Tên: </span> {user.name ?? user.username ?? '-'}
          </div>
          <div>
            <span className="font-medium">ID: </span> {user._id ?? '-'}
          </div>
          <div>
            <span className="font-medium">Role: </span> {user.role ?? '-'}
          </div>
          <div>
            <span className="font-medium">Department: </span> {user.department ?? '-'}
          </div>
          <div>
            <span className="font-medium">Status: </span> {user.status ?? '-'}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-center">
          <button className="flex cursor-pointer items-center gap-2 px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition active:scale-95">
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoModal;
