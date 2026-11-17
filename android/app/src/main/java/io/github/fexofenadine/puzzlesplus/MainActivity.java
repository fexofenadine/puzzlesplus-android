package io.github.fexofenadine.puzzlesplus;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.HapticFeedbackConstants;
import android.view.ViewConfiguration;
import android.view.ViewGroup.MarginLayoutParams;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        //the webview would stretch every text by the system font size, the boards' digits too, so
        //the page asks PuzzlesText for the size and grows only its menus, bars and dialogs
        webView.getSettings().setTextZoom(100);
        //the page hands the system bars its theme's title bar colour, asks for a buzz and the
        //long press time, and reads the font size
        webView.addJavascriptInterface(new Bars(), "PuzzlesBars");
        webView.addJavascriptInterface(new Touch(), "PuzzlesTouch");
        webView.addJavascriptInterface(new Text(), "PuzzlesText");
        //the webview buzzes at the system's long press time, before a held cell is flagged and
        //even when let go too soon to flag, so only the page's own buzz is kept
        webView.setHapticFeedbackEnabled(false);
        fitInsets(webView);
        fitBars(getResources().getConfiguration());
    }

    //android 15 draws every app edge to edge, under the system bars and the keyboard, so the
    //page is kept clear of both; earlier versions resize the window for the keyboard themselves
    private void fitInsets(WebView webView) {
        if (Build.VERSION.SDK_INT < 35) return;
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            MarginLayoutParams margins = (MarginLayoutParams) v.getLayoutParams();
            margins.leftMargin = bars.left;
            margins.topMargin = bars.top;
            margins.rightMargin = bars.right;
            margins.bottomMargin = Math.max(bars.bottom, keyboard.bottom);
            v.setLayoutParams(margins);
            return WindowInsetsCompat.CONSUMED;
        });
    }

    @Override
    public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);
        fitBars(config);
        //a font size changed in settings reaches the page without a reload
        getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('fontscale'))", null);
    }

    //a dialog or the recent apps screen can bring the bars back, so hide them again on return
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) fitBars(getResources().getConfiguration());
    }

    //held sideways the screen is short, so the status and navigation bars go until a swipe
    //from the edge shows them for a moment
    private void fitBars(Configuration config) {
        Window window = getWindow();
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        if (config.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            bars.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            bars.show(WindowInsetsCompat.Type.systemBars());
        }
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

    //the system's own long press buzz, which follows the phone's touch feedback setting and
    //needs no permission, unlike the web's vibrate
    private class Touch {
        @JavascriptInterface
        public void longPress() {
            runOnUiThread(() -> getBridge().getWebView().performHapticFeedback(
                HapticFeedbackConstants.LONG_PRESS, HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING));
        }

        //how long a press must be held to count as long, set under accessibility's touch and hold delay
        @JavascriptInterface
        public int longPressTimeout() {
            return ViewConfiguration.getLongPressTimeout();
        }
    }

    //how much bigger text of a given size shows at the system font size; android 14 and later
    //grow big text less than small, so the page asks for each size it uses
    private class Text {
        @JavascriptInterface
        public float scale(float sp) {
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, metrics)
                / TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, sp, metrics);
        }
    }
}
