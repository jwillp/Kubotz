package com.brm.Kubotz.desktop;

import com.badlogic.gdx.backends.lwjgl.LwjglApplication;
import com.badlogic.gdx.backends.lwjgl.LwjglApplicationConfiguration;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Game;

public class DesktopLauncher {
	public static void main (String[] arg) {
		LwjglApplicationConfiguration config = new LwjglApplicationConfiguration();

		config.title = Config.TITLE;
		config.width = Config.V_WIDTH;
		config.height = Config.V_HEIGHT;

		new LwjglApplication(new Game(), config);
	}
}
