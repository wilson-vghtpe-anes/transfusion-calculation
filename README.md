# Transfusion Calculation

這個專案目前是可安裝的 `PWA`，可在 iPhone 的 Safari 開啟後加入主畫面使用。

## 本機執行

因為 `service worker` 需要在 `http://localhost` 或正式 `https` 網址下運作，不要直接雙擊 `index.html`。

如果電腦有 Python：

```bash
python -m http.server 8080
```

然後開啟：

```text
http://localhost:8080
```

## iPhone 使用

1. 把專案部署到可用的 `https` 網址。
2. 用 iPhone Safari 開啟網址。
3. 點選「分享」。
4. 選「加入主畫面」。

## 下一步可升級

- 直接維持 PWA 型式使用。
- 若要上 App Store，可再用 Capacitor 包成 iOS app。
