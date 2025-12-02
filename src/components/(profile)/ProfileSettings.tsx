function ProfileSettings() {
  return (
    <div className="space-y-3">
      {['Đổi mật khẩu', 'Quyền riêng tư', 'Cài đặt thông báo'].map((item) => (
        <button key={item} className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg md:text-lg">
          {item}
        </button>
      ))}
    </div>
  );
}
export default ProfileSettings;
