package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.GameStates.InGameScreen;


public class Game extends ApplicationAdapter {


	private GameScreenManager stateManager;
	private int accum;

	@Override
	public void create () {
		stateManager = new GameScreenManager();
		stateManager.init();
		stateManager.addState(new InGameScreen());
	}


	@Override
	public void render () {
		stateManager.handleEvents();
		stateManager.update(Gdx.graphics.getDeltaTime());
		stateManager.draw();

	}





}
