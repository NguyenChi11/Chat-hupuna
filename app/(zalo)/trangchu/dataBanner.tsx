export interface Banner {
  image: string; // Đường dẫn hình ảnh
  title: string; // Tiêu đề banner
  description: string; // Mô tả banner
  buttonText?: string; // Text nút bấm, có thể không có
}
export const banners: Banner[] = [
  {
    image: '/imgs/banner1.png',
    title: 'Giao diện Dark Mode',
    description: 'Thư giãn và bảo vệ mắt với chế độ giao diện tối mới trên Zalo',
    buttonText: 'Thử ngay',
  },
  {
    image: '/imgs/banner2.png',
    title: 'Kinh doanh hiệu quả với zBusiness Pro',
    description:
      'Bán hàng chuyên nghiệp với Nhân Business và Bộ công cụ kinh doanh, mở khoá tầm năng tiếp cận khách hàng trên Zalo',
    buttonText: 'Tìm hiểu ngay',
  },
  {
    image: '/imgs/banner3.png',
    title: 'Nhắn tin nhiều hơn ,soạn thảo ít hơn',
    description: 'Sử dụng Tin Nhắn Nhanh để lưu sẵn các tin nhắn thường dùng và gửi nhanh trong hội thoại bất kỳ',
  },
  {
    image: '/imgs/banner4.png',
    title: 'Trải nghiệm xuyên suốt',
    description: 'Kết nối và giải quyết công việc trên mọi thiết bị dữ liệu luôn được đồng bộ',
  },
  { image: '/imgs/banner5.png', title: 'Gửi File nặng?', description: 'Đã có Zalo "xử" hết ' },
];
