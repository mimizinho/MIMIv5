with open("index.html", encoding="utf-8") as f:
    lines = f.readlines()

def ins(after_line_1based, new_lines):
    idx = after_line_1based
    lines[idx:idx] = [l + "\n" for l in new_lines]

# 1) depois de "var remote = readRemoteVersion(text);" (linha 4211)
ins(4211, [
    "        maybeCheckApkUpdate(text);",
])

# 2) depois do fechamento de readRemoteVersion() (linha 4192)
ins(4192, [
    "",
    "  function maybeCheckApkUpdate(text) {",
    "    if (apkBannerShown || !isRunningInNativeApp()) return;",
    "    try {",
    "      var obj = JSON.parse(text || \"\");",
    "      var apkVersion = obj && obj.apkVersion ? String(obj.apkVersion) : null;",
    "      var apkUrl = obj && obj.apkUrl ? String(obj.apkUrl) : null;",
    "      if (apkVersion && apkUrl && apkVersion !== APK_VERSION) {",
    "        showApkUpdateBanner(apkUrl);",
    "      }",
    "    } catch (e) {}",
    "  }",
    "",
    "  function showApkUpdateBanner(apkUrl) {",
    "    if (apkBannerShown || document.getElementById(\"mimi-apk-update-banner\")) return;",
    "    apkBannerShown = true;",
    "    var b = document.createElement(\"div\");",
    "    b.id = \"mimi-apk-update-banner\";",
    "    b.style.cssText = \"position:fixed;left:12px;right:12px;top:12px;z-index:2147483647;\" +",
    "      \"background:#ff6fa5;color:#fff;padding:12px 16px;border-radius:14px;\" +",
    "      \"font-size:14px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);\" +",
    "      \"display:flex;align-items:center;justify-content:space-between;gap:10px;\";",
    "    var span = document.createElement(\"span\");",
    "    span.textContent = \"Nova vers\u00e3o do app dispon\u00edvel\";",
    "    var a = document.createElement(\"a\");",
    "    a.href = apkUrl;",
    "    a.textContent = \"Baixar\";",
    "    a.style.cssText = \"background:#fff;color:#ff2d78;padding:6px 14px;border-radius:999px;\" +",
    "      \"text-decoration:none;font-weight:700;white-space:nowrap;\";",
    "    b.appendChild(span);",
    "    b.appendChild(a);",
    "    document.body.appendChild(b);",
    "  }",
])

# 3) depois de "var CHECK_INTERVAL = ..." (linha 4103)
ins(4103, [
    "",
    "  // \u2014\u2014 Atualiza\u00e7\u00e3o do APK nativo (Android) \u2014\u2014",
    "  var APK_VERSION = \"1.0.1\";",
    "  var apkBannerShown = false;",
    "  function isRunningInNativeApp() {",
    "    return /MIMIApp\\//.test(navigator.userAgent || \"\");",
    "  }",
])

with open("index.html", "w", encoding="utf-8") as f:
    f.writelines(lines)
print("OK: patched by line number")
