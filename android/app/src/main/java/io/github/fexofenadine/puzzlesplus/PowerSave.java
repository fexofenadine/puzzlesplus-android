package io.github.fexofenadine.puzzlesplus;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;

//tells the wallpaper's or the dream's page when the battery saver comes on or goes off, so it can
//slow down (the page's "Slow down in battery saver" setting)
final class PowerSave {
    //java's own Consumer needs android 7, the app runs from 6
    interface Told {
        void accept(boolean on);
    }

    private final Context context;
    private final Told told;
    private boolean listening = false;
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent intent) {
            tell();
        }
    };

    PowerSave(Context context, Told told) {
        this.context = context;
        this.told = told;
    }

    boolean on() {
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return power != null && power.isPowerSaveMode();
    }

    void tell() {
        told.accept(on());
    }

    void start() {
        if (listening) return;
        context.registerReceiver(receiver, new IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED));
        listening = true;
        tell();
    }

    void stop() {
        if (!listening) return;
        context.unregisterReceiver(receiver);
        listening = false;
    }
}
