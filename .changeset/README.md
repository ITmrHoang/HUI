# Changesets

Mỗi thay đổi đáng ghi vào CHANGELOG cần một file changeset:

```bash
npx changeset          # chọn mức tăng version (patch / minor / major) + mô tả ngắn
```

Khi PR có changeset được merge vào `main`, workflow **Release** tự mở PR **"Version packages"**
(tăng version + cập nhật CHANGELOG). Merge PR đó → workflow tự `npm publish`, gắn tag `vX.Y.Z`
và tạo GitHub Release.
