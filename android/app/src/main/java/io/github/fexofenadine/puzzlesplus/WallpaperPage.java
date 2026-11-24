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

    static WebView make(Context context) {
        return make(context, null);
    }

    //loaded runs each time the page has finished loading, a reload after its settings change too
    @SuppressLint("SetJavaScriptEnabled")
    static WebView make(Context context, Runnable loaded) {
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

            @Override
            public void onPageFinished(WebView view, String url) {
                if (loaded != null) loaded.run();
            }
        });
        return web;
    }
}
