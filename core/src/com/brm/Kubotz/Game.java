package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.GameScreens.InGameScreen;
import com.brm.Kubotz.GameScreens.LoadingScreen;
import com.brm.Kubotz.GameScreens.TitleScreen;


public class Game extends ApplicationAdapter {



	@Override
	public void create () {

		GoatEngine.init();


		// READ GAME PROPERTIES FROM FILE
		Config.load();
		if(Config.FULL_SCREEN){
			Gdx.graphics.setDisplayMode(
					Gdx.graphics.getDesktopDisplayMode().width,
					Gdx.graphics.getDesktopDisplayMode().height,
					Config.FULL_SCREEN
			);
		}

		GoatEngine.gameScreenManager.addScreen(new TitleScreen());
	}


	@Override
	public void render () {
		GoatEngine.update();
	}

	@Override
	public void dispose() {
		Config.save();
	}
}
