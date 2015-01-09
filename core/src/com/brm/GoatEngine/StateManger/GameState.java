package com.brm.GoatEngine.StateManger;

public abstract class GameState {



    protected GameState(){

    }


    public void pause() {}

    public abstract void  init(GameStateManager engine);

    public abstract void cleanUp();

    public abstract void resume();


    public abstract void handleInput(GameStateManager engine);

    public abstract void update(GameStateManager engine, float deltaTime);

    public abstract void draw(GameStateManager engine);


    public void changeState(GameStateManager engine, GameState state){
        engine.changeState(state);
    }




}
