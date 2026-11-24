package io.github.fexofenadine.puzzlesplus;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

//android's own screens for setting the live wallpaper and choosing the screen saver
final class LiveScreens {
    private LiveScreens() {}

    //the wallpaper's preview with its set button, or the live wallpaper list where that is missing
    static void setWallpaper(Activity activity) {
        Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
        intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, new ComponentName(activity, PuzzlesWallpaper.class));
        try {
            activity.startActivity(intent);
        } catch (Exception e) {
            activity.startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER));
        }
    }

    //some phones' makers hide the screen saver settings, so the app only offers them where they open
    static boolean hasScreenSaver(Context context) {
        return new Intent(Settings.ACTION_DREAM_SETTINGS).resolveActivity(context.getPackageManager()) != null;
    }

    static void openScreenSaver(Activity activity) {
        try {
            activity.startActivity(new Intent(Settings.ACTION_DREAM_SETTINGS));
        } catch (Exception e) {
            activity.startActivity(new Intent(Settings.ACTION_DISPLAY_SETTINGS));
        }
    }
}
