package io.github.fexofenadine.puzzlesplus;

import android.app.Activity;
import android.os.Bundle;
import android.view.ViewGroup.MarginLayoutParams;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

//the live wallpaper's settings, opened from the wallpaper picker or the app's menu: the same page as
//the windows screensaver's settings, over the wallpaper itself running behind it
public class WallpaperSettings extends Activity {
    private WebView web;

    protected String page() {
        return "screensaver/settings.html";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = WallpaperPage.make(this);
        web.addJavascriptInterface(new Bridge(), "PuzzlesWallpaper");
        FrameLayout frame = new FrameLayout(this);
        frame.addView(web);
        setContentView(frame);
        //android 15 draws under the system bars, so the page is kept clear of them
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            MarginLayoutParams margins = (MarginLayoutParams) v.getLayoutParams();
            margins.setMargins(bars.left, bars.top, bars.right, bars.bottom);
            v.setLayoutParams(margins);
            return WindowInsetsCompat.CONSUMED;
        });
        web.loadUrl(WallpaperPage.url(page()));
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    //the page's close, set wallpaper and screen saver buttons
    private class Bridge {
        @JavascriptInterface
        public void close() {
            runOnUiThread(WallpaperSettings.this::finish);
        }

        @JavascriptInterface
        public void apply() {
            runOnUiThread(() -> LiveScreens.setWallpaper(WallpaperSettings.this));
        }

        //whether the phone has screen saver settings to open, some makers hide them
        @JavascriptInterface
        public boolean dreams() {
            return LiveScreens.hasScreenSaver(WallpaperSettings.this);
        }

        @JavascriptInterface
        public void dream() {
            runOnUiThread(() -> LiveScreens.openScreenSaver(WallpaperSettings.this));
        }
    }
}
