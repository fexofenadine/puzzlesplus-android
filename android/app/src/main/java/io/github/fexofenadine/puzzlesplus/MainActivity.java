package io.github.fexofenadine.puzzlesplus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        //the games are laid out to the pixel and have their own zoom, so the system font size
        //must not stretch their text and rows
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
