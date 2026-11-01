package io.github.fexofenadine.puzzlesplus;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.webkit.JavascriptInterface;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        //the games are laid out to the pixel and have their own zoom, so the system font size
        //must not stretch their text and rows
        getBridge().getWebView().getSettings().setTextZoom(100);
        //the page hands the system bars its theme's title bar colour
        getBridge().getWebView().addJavascriptInterface(new Bars(), "PuzzlesBars");
    }

    private class Bars {
        @JavascriptInterface
        public void set(String colour) {
            int c;
            try {
                c = Color.parseColor(colour);
            } catch (IllegalArgumentException e) {
                return;
            }
            runOnUiThread(() -> {
                Window window = getWindow();
                //android 15 draws the app behind the bars, so there the window's background shows
                window.getDecorView().setBackgroundColor(c);
                //earlier versions colour the bars themselves
                window.setStatusBarColor(c);
                window.setNavigationBarColor(c);
                //dark icons on a light colour, light icons on a dark one
                boolean light = 0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c) > 160;
                WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
                bars.setAppearanceLightStatusBars(light);
                bars.setAppearanceLightNavigationBars(light);
            });
        }
    }
}
