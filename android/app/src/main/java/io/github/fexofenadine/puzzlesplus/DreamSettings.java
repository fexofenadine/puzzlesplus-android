package io.github.fexofenadine.puzzlesplus;

//the screen saver's settings, opened from android's screen saver settings: the wallpaper's own
//settings, which the two share, titled for the screen saver
public class DreamSettings extends WallpaperSettings {
    @Override
    protected String page() {
        return "screensaver/settings.html?dream";
    }
}
