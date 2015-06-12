package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.GameScreens.InGameScreen;
import com.brm.Kubotz.GameScreens.LoadingScreen;
import com.brm.Kubotz.GameScreens.TitleScreen;


public class Game extends ApplicationAdapter {


	private GameScreenManager screenManager;

	@Override
	public void create () {

		// READ GAME PROPERTIES FROM FILE
		Config.load();
		if(Config.FULL_SCREEN){
			Gdx.graphics.setDisplayMode(
					Gdx.graphics.getDesktopDisplayMode().width,
					Gdx.graphics.getDesktopDisplayMode().height,
					Config.FULL_SCREEN
			);
		}
		screenManager = new GameScreenManager();
		screenManager.init();
		screenManager.addScreen(new TitleScreen());
	}


	@Override
	public void render () {
		float deltaTime = Gdx.graphics.getDeltaTime();
		screenManager.handleEvents();
		screenManager.update(deltaTime);
		screenManager.draw(deltaTime);

	}

	@Override
	public void dispose() {
		Config.save();
	}
}
