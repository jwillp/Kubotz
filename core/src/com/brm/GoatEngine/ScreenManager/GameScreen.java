package com.brm.GoatEngine.ScreenManager;

public abstract class GameScreen {



    protected GameScreen(){}

    public void pause() {}

    public abstract void  init(GameScreenManager engine);

    public abstract void cleanUp();

    public abstract void resume();


    public abstract void handleInput(GameScreenManager engine);

    public abstract void update(GameScreenManager engine, float deltaTime);

    public abstract void draw(GameScreenManager engine, float deltaTime);


    public void changeState(GameScreenManager engine, GameScreen state){
        engine.changeScreen(state);
    }




}
