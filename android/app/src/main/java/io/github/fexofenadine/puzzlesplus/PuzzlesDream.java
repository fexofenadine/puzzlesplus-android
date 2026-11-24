package io.github.fexofenadine.puzzlesplus;

import android.service.dreams.DreamService;
import android.webkit.WebView;

//the themes' backgrounds as the phone's screen saver: a dream is an ordinary window, so unlike the
//wallpaper the page's webview sits in it directly, with the wallpaper's page and settings
public class PuzzlesDream extends DreamService {
    private WebView web;
    private final PowerSave saver = new PowerSave(this, (on) -> {
        if (web != null) web.evaluateJavascript("window.saving && saving(" + on + ")", null);
    });

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        //a touch ends the dream, the page never needs one
        setInteractive(false);
        setFullscreen(true);
        web = WallpaperPage.make(this, saver::tell);
        setContentView(web);
        web.loadUrl(WallpaperPage.url("screensaver/index.html?wallpaper"));
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        if (web != null) web.onResume();
        saver.start();
    }

    @Override
    public void onDreamingStopped() {
        saver.stop();
        if (web != null) web.onPause();
        super.onDreamingStopped();
    }

    @Override
    public void onDetachedFromWindow() {
        saver.stop();
        if (web != null) web.destroy();
        web = null;
        super.onDetachedFromWindow();
    }
}
