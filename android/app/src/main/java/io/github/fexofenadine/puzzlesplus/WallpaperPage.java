package io.github.fexofenadine.puzzlesplus;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

//the live wallpaper's pages (src/screensaver in the website's code), served from the app's own
//files at one https address, so the wallpaper and its settings share their saved settings
final class WallpaperPage {
    private static final String HOST = "appassets.androidplatform.net";

    private WallpaperPage() {}

    //capacitor copies the built pages to assets/public
    static String url(String path) {
        return "https://" + HOST + "/public/" + path;
    }

    @SuppressLint("SetJavaScriptEnabled")
    static WebView make(Context context) {
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(context))
            .build();
        WebView web = new WebView(context);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setTextZoom(100);
        web.setBackgroundColor(Color.BLACK);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        return web;
    }
}
