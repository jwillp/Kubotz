package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.GameScreens.InGameScreen;


public class Game extends ApplicationAdapter {


	private GameScreenManager screenManager;
	private int accum;

	@Override
	public void create () {
		screenManager = new GameScreenManager();
		screenManager.init();
		screenManager.addScreen(new InGameScreen());
	}


	@Override
	public void render () {
		screenManager.handleEvents();
		screenManager.update(Gdx.graphics.getDeltaTime());
		screenManager.draw();

	}





}
