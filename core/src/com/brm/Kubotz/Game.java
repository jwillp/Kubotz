package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.GameScreens.InGameScreen;


public class Game extends ApplicationAdapter {


	private GameScreenManager stateManager;
	private int accum;

	@Override
	public void create () {
		stateManager = new GameScreenManager();
		stateManager.init();
		stateManager.addScreen(new InGameScreen());
	}


	@Override
	public void render () {
		float deltaTime = Gdx.graphics.getDeltaTime();
		stateManager.handleEvents();
		stateManager.update(deltaTime);
		stateManager.draw(deltaTime);
	}





}
