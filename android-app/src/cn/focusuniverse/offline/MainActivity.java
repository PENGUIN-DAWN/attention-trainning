package cn.focusuniverse.offline;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Offline app: only the packaged page is served, and no network permission is declared. */
public final class MainActivity extends Activity {
    private static final String HOME = "https://appassets.androidplatform.net/assets/index.html";
    private static final int IMPORT = 101, EXPORT = 102;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingBackup;
    private long lastBack;
    private volatile boolean contentReady;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 31) {
            long launched = SystemClock.elapsedRealtime();
            getWindow().getDecorView().getViewTreeObserver().addOnPreDrawListener(new android.view.ViewTreeObserver.OnPreDrawListener() {
                @Override public boolean onPreDraw() {
                    if (!contentReady && SystemClock.elapsedRealtime() - launched < 1800) return false;
                    getWindow().getDecorView().getViewTreeObserver().removeOnPreDrawListener(this);
                    return true;
                }
            });
            getSplashScreen().setOnExitAnimationListener(splash -> {
                if (systemMotionReduced()) { splash.remove(); return; }
                // Content is already ready; never wait for the icon animation to finish.
                splash.animate().alpha(0f).setDuration(140).withEndAction(splash::remove).start();
            });
        }
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(13, 18, 27));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(13, 18, 27));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // User-selected backup via the system document picker.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        android.webkit.CookieManager.getInstance().setAcceptCookie(false);
        web.addJavascriptInterface(new BackupBridge(), "FocusDevice");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageCommitVisible(WebView view, String url) { contentReady = true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && "/assets/index.html".equals(uri.getPath())) {
                    try { return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html")); }
                    catch (IOException error) { Log.e("FocusOffline", "Packaged page unavailable", error); }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Offline only", null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return !(url.equals(HOME) || url.startsWith(HOME + "#"));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) Log.e("FocusOffline", message.message());
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { startActivityForResult(pick, IMPORT); }
                catch (android.content.ActivityNotFoundException error) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    Toast.makeText(MainActivity.this, "系统文件选择器不可用", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        getWindow().getDecorView().setSystemUiVisibility(0); // Light icons on the dark app chrome.
        web.loadUrl(HOME + "#home");
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }

    @Override protected void onPause() {
        web.evaluateJavascript("window.focusAndroidSuspend && window.focusAndroidSuspend()", null);
        web.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.focusUpdateSystemMotion && window.focusUpdateSystemMotion(" + systemMotionReduced() + ");window.focusAndroidResume && window.focusAndroidResume()", null);
        }
    }
    private boolean systemMotionReduced() {
        return android.provider.Settings.Global.getFloat(getContentResolver(), android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f;
    }

    @Override public void onBackPressed() {
        handleBack();
    }
    private void handleBack() {
        web.evaluateJavascript("window.focusAndroidBack ? window.focusAndroidBack() : false", handled -> {
            if ("true".equals(handled)) return;
            long now = SystemClock.elapsedRealtime();
            if (now - lastBack < 2000) { finish(); return; }
            lastBack = now;
            Toast.makeText(this, "再按一次返回键退出", Toast.LENGTH_SHORT).show();
        });
    }

    public final class BackupBridge {
        @JavascriptInterface public boolean systemReducedMotion() { return systemMotionReduced(); }
        @JavascriptInterface public void contentReady() { contentReady = true; }
        @JavascriptInterface public void exportBackup(String json) {
            if (json == null || json.length() > 24000000) { backupResult("failure"); return; }
            runOnUiThread(() -> {
                if (pendingBackup != null) return;
                pendingBackup = json;
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                String date = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
                save.putExtra(Intent.EXTRA_TITLE, "focus-backup-" + date + ".json");
                try { startActivityForResult(save, EXPORT); }
                catch (android.content.ActivityNotFoundException error) {
                    pendingBackup = null;
                    Toast.makeText(MainActivity.this, "系统文件保存器不可用", Toast.LENGTH_LONG).show();
                    backupResult("failure");
                }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == IMPORT && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        } else if (request == EXPORT) {
            String json = pendingBackup; pendingBackup = null;
            if (result != RESULT_OK || data == null || data.getData() == null || json == null) { backupResult("cancelled"); return; }
            try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "wt")) {
                if (output == null) throw new IOException("Cannot open document");
                output.write(json.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "完整备份已导出", Toast.LENGTH_SHORT).show();
                backupResult("success");
            } catch (IOException error) { Toast.makeText(this, "保存失败，请换个位置重试", Toast.LENGTH_LONG).show(); backupResult("failure"); }
        }
    }

    private void backupResult(String status) {
        web.evaluateJavascript("window.focusBackupResult && window.focusBackupResult(" + org.json.JSONObject.quote(status) + ")", null);
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (web != null) { web.removeJavascriptInterface("FocusDevice"); web.destroy(); }
        super.onDestroy();
    }
}
