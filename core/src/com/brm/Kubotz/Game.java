package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.Kubotz.GameScreens.InGameScreen;
import org.mozilla.javascript.JavaAdapter;


public class Game extends ApplicationAdapter {



	@Override
	public void create () {

		GoatEngine.init();

		//EXPOSE SCRIPTING API




		// READ GAME PROPERTIES FROM FILE
		Config.load();
		if(Config.FULL_SCREEN){
			Gdx.graphics.setDisplayMode(
					Gdx.graphics.getDesktopDisplayMode().width,
					Gdx.graphics.getDesktopDisplayMode().height,
					Config.FULL_SCREEN
			);
		}

		GoatEngine.gameScreenManager.addScreen(new InGameScreen());
	}


	@Override
	public void render () {
		GoatEngine.update();
	}

	@Override
	public void dispose() {
		Config.save();
		GoatEngine.cleanUp();
	}
}
