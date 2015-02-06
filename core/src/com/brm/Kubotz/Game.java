package com.brm.Kubotz;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.StateManger.GameStateManager;
import com.brm.Kubotz.GameStates.InGameState;


public class Game extends ApplicationAdapter {


	private GameStateManager stateManager;
	private int accum;

	@Override
	public void create () {
		stateManager = new GameStateManager();
		stateManager.init();
		stateManager.addState(new InGameState());
	}


	@Override
	public void render () {
		stateManager.handleEvents();
		stateManager.update(Gdx.graphics.getDeltaTime());
		stateManager.draw();

	}





}
