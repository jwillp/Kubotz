package com.brm.GoatEngine.ScreenManager;

import com.brm.GoatEngine.ECS.common.ScriptSystem;
import com.brm.GoatEngine.ECS.core.ECSManager;
import com.brm.GoatEngine.ECS.core.EntityManager;

public abstract class GameScreen{

    protected ECSManager ecsManager = new ECSManager();


    public GameScreen(){
        // The Default Script System
        ecsManager.getSystemManager().addSystem(ScriptSystem.class, new ScriptSystem());
    }

    public void pause() {}

    public void init(GameScreenManager engine) {
    }

    public void cleanUp() {

    }

    public void resume() {

    }


    public void handleInput(GameScreenManager engine) {

    }

    public void update(GameScreenManager engine, float deltaTime) {

    }

    public void draw(GameScreenManager engine, float deltaTime) {

    }



    public EntityManager getEntityManager(){
        return this.ecsManager.getEntityManager();
    }






}
