package com.brm.Kubotz.desktop;

import com.badlogic.gdx.backends.lwjgl.LwjglApplication;
import com.badlogic.gdx.backends.lwjgl.LwjglApplicationConfiguration;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Game;

public class DesktopLauncher {
	public static void main (String[] arg) {
		LwjglApplicationConfiguration cfg = new LwjglApplicationConfiguration();

		cfg.title = Config.TITLE;
		cfg.width = Config.V_WIDTH;
		cfg.height = Config.V_HEIGHT;
		cfg.fullscreen = Config.FULL_SCREEN;

		new LwjglApplication(new Game(), cfg);
	}
}
