package io.github.fexofenadine.puzzlesplus;

import android.app.Presentation;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;
import android.webkit.WebView;

//the themes' backgrounds as a live wallpaper: a wallpaper gets a surface to draw on but cannot hold
//views, so the page runs in a webview on a private virtual display that draws into that surface
public class PuzzlesWallpaper extends WallpaperService {
    @Override
    public Engine onCreateEngine() {
        return new PageEngine();
    }

    private class PageEngine extends Engine {
        private VirtualDisplay display;
        private Presentation presentation;
        private WebView web;
        private final PowerSave saver = new PowerSave(PuzzlesWallpaper.this, (on) -> {
            if (web != null) web.evaluateJavascript("window.saving && saving(" + on + ")", null);
        });

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            //the launcher's home screen offsets, for the drift
            setOffsetNotificationsEnabled(true);
            setTouchEventsEnabled(false);
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            int dpi = getResources().getDisplayMetrics().densityDpi;
            if (display != null) {
                display.setSurface(holder.getSurface());
                display.resize(width, height, dpi);
                return;
            }
            DisplayManager displays = (DisplayManager) getSystemService(DISPLAY_SERVICE);
            display = displays.createVirtualDisplay("Puzzles Plus wallpaper", width, height, dpi, holder.getSurface(), 0);
            presentation = new Presentation(PuzzlesWallpaper.this, display.getDisplay());
            web = WallpaperPage.make(presentation.getContext(), saver::tell);
            presentation.setContentView(web);
            presentation.show();
            web.loadUrl(WallpaperPage.url("screensaver/index.html?wallpaper"));
            if (isVisible()) saver.start();
            else web.onPause();
        }

        //nothing is drawn while an app covers the home screen or the screen is off
        @Override
        public void onVisibilityChanged(boolean visible) {
            if (web == null) return;
            //the battery saver is only listened for while the wallpaper shows
            if (visible) {
                web.onResume();
                saver.start();
            } else {
                saver.stop();
                web.onPause();
            }
        }

        @Override
        public void onOffsetsChanged(float x, float y, float xStep, float yStep, int xPixels, int yPixels) {
            if (web != null) web.evaluateJavascript("window.drift && drift(" + x + ")", null);
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            release();
            super.onSurfaceDestroyed(holder);
        }

        @Override
        public void onDestroy() {
            release();
            super.onDestroy();
        }

        private void release() {
            saver.stop();
            if (presentation != null) presentation.dismiss();
            if (web != null) web.destroy();
            if (display != null) display.release();
            presentation = null;
            web = null;
            display = null;
        }
    }
}
