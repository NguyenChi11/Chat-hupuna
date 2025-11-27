export const ConfirmModal: React.FC<{
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, message, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 mb-8">{message}</p>
      <div className="flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition font-medium"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  </div>
);
