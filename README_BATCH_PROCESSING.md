# Batch Article Processing System

Hệ thống xử lý nhiều bài viết tự động từ file `today-articles.md`, tuân thủ chặt chẽ rule `get_single_article`.

## 🚀 Quick Start

### 1. Chuẩn bị file today-articles.md
```bash
# Đảm bảo file articles/today-articles.md có các URL
cat articles/today-articles.md
```

### 2. Download tất cả bài viết
```bash
node batch_article_processor.js
```

### 3. Xử lý từng bài viết với cursor
```bash
# Xem danh sách bài viết và trạng thái
node cursor_processor.js list

# Mở cursor cho bài viết tiếp theo cần xử lý
node cursor_processor.js next

# Hoặc mở cursor cho bài viết cụ thể
node cursor_processor.js open 1
```

## 📁 Cấu trúc thư mục

Sau khi chạy, hệ thống sẽ tạo cấu trúc:
```
articles/
├── today-articles.md          # File chứa URLs cần xử lý
├── A-0001/                    # Bài viết 1
│   ├── raw.html              # HTML gốc từ Gizmodo
│   ├── content.md            # Nội dung tiếng Việt (tạo bằng cursor)
│   ├── images.txt            # Danh sách 5 ảnh
│   └── [5 ảnh đã download]
├── A-0002/                    # Bài viết 2
│   ├── raw.html
│   ├── content.md
│   ├── images.txt
│   └── [5 ảnh đã download]
└── ...
```

## 🔧 Các script chính

### 1. batch_article_processor.js
**Chức năng**: Download tất cả bài viết từ `today-articles.md`

**Cách dùng**:
```bash
node batch_article_processor.js
```

**Quy trình**:
1. Đọc URLs từ `articles/today-articles.md`
2. Tạo thư mục `A-0001`, `A-0002`, etc.
3. Download HTML gốc bằng curl
4. Trích xuất 5 ảnh và tạo `images.txt`
5. Download ảnh bằng `download_images.js`

### 2. cursor_processor.js
**Chức năng**: Quản lý việc xử lý bài viết với cursor

**Các lệnh**:
```bash
# Xem danh sách và trạng thái
node cursor_processor.js list

# Mở cursor cho bài viết tiếp theo
node cursor_processor.js next

# Mở cursor cho bài viết cụ thể
node cursor_processor.js open 1

# Xem hướng dẫn
node cursor_processor.js help
```

### 3. download_images.js
**Chức năng**: Download và xử lý ảnh cho bài viết

**Cách dùng**:
```bash
node download_images.js articles/A-0001
```

## 📝 Quy trình xử lý bài viết

### Bước 1: Download bài viết
```bash
node batch_article_processor.js
```

### Bước 2: Xử lý nội dung với cursor
```bash
# Mở cursor cho bài viết đầu tiên
node cursor_processor.js next
```

Trong cursor, làm theo rule `get_single_article`:
1. Đọc `raw.html`
2. Tạo `content.md` với cấu trúc:
   - **Tiêu đề**: Tiếng Việt (≤150 ký tự)
   - **Tóm tắt**: 2-3 câu (≤300 ký tự)
   - **Đánh Giá Sản Phẩm**: 1000-2000 từ
   - **Phân Tích Chi Tiết**: 500-1000 từ
   - **Kết Luận và Khuyến Nghị**: 200-300 từ
   - **Trích dẫn nguồn**: URL gốc

### Bước 3: Download ảnh
```bash
node download_images.js articles/A-0001
```

### Bước 4: Lặp lại cho bài viết tiếp theo
```bash
node cursor_processor.js next
```

## 🎯 Trạng thái bài viết

Hệ thống hiển thị trạng thái:
- ❌ **Missing raw.html**: Download thất bại
- 📝 **Ready for cursor processing**: Sẵn sàng xử lý với cursor
- 🖼️ **Content ready, needs images**: Cần download ảnh
- ✅ **Complete**: Hoàn thành

## 📋 Yêu cầu nội dung

### Cấu trúc content.md
```markdown
# Tiêu đề bài viết (≤150 ký tự)

Tóm tắt ngắn gọn về bài viết trong 2-3 câu, không quá 300 ký tự.

## Đánh Giá Sản Phẩm

[1000-2000 từ, viết từ góc nhìn người dùng thực tế, sử dụng ngôi thứ nhất]

## Phân Tích Chi Tiết

### Ưu điểm
[Liệt kê và phân tích các điểm mạnh]

### Nhược điểm  
[Liệt kê và phân tích các điểm yếu]

### Giá cả
[Đánh giá về giá trị tiền bạc]

### Đánh giá tổng thể
[Kết luận về sản phẩm/dịch vụ]

## Kết Luận và Khuyến Nghị

[Suy nghĩ cuối cùng và khuyến nghị hành động cụ thể]

Trích dẫn nguồn: [URL gốc từ Gizmodo]
```

### Chuyển đổi đơn vị
- Inches → cm (1 inch = 2.54 cm)
- Pounds → kg (1 pound = 0.453592 kg)
- Miles → km (1 mile = 1.60934 km)
- Fahrenheit → Celsius (F-32)*5/9
- Dollars → VND (1 USD = 24,000 VND)

## 🖼️ Yêu cầu ảnh

- **5 ảnh khác nhau** cho mỗi bài viết
- Chỉ lấy ảnh chính từ nội dung bài viết
- Loại trừ: thumbnail, sidebar, related articles, ads
- Ưu tiên ảnh độ phân giải cao
- **Bắt buộc**: Xác minh thủ công để đảm bảo ảnh đúng nội dung

## ⚠️ Lưu ý quan trọng

1. **Tuân thủ rule**: Mỗi bài viết phải tuân thủ chặt chẽ rule `get_single_article`
2. **Tiếng Việt hoàn toàn**: Không có tiếng Anh trong nội dung
3. **Cấu trúc bắt buộc**: Phải có đầy đủ 3 phần chính
4. **Dòng trống**: Thêm dòng trống giữa các đoạn văn
5. **Xác minh ảnh**: Kiểm tra thủ công ảnh trước khi download

## 🔄 Workflow hoàn chỉnh

```bash
# 1. Download tất cả bài viết
node batch_article_processor.js

# 2. Xử lý từng bài viết
node cursor_processor.js list          # Xem danh sách
node cursor_processor.js next          # Mở bài viết đầu tiên
# [Xử lý trong cursor theo rule get_single_article]
node download_images.js articles/A-0001 # Download ảnh

# 3. Lặp lại cho bài viết tiếp theo
node cursor_processor.js next
# [Xử lý trong cursor]
node download_images.js articles/A-0002

# 4. Tiếp tục cho đến khi hoàn thành tất cả
```

## 🎉 Kết quả

Sau khi hoàn thành, bạn sẽ có:
- Tất cả bài viết được download và xử lý
- Nội dung tiếng Việt chất lượng cao
- Ảnh minh họa phù hợp
- Sẵn sàng để publish lên TechLoop

## 🆘 Troubleshooting

### Lỗi download
- Kiểm tra kết nối internet
- Đảm bảo URL trong `today-articles.md` hợp lệ
- Thử chạy lại `batch_article_processor.js`

### Lỗi cursor
- Đảm bảo cursor đã được cài đặt
- Kiểm tra quyền truy cập thư mục
- Thử lệnh `cursor --version`

### Lỗi ảnh
- Kiểm tra file `images.txt` có tồn tại
- Đảm bảo URL ảnh hợp lệ
- Thử download thủ công từng ảnh 