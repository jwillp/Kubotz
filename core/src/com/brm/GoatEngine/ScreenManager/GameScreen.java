package com.brm.GoatEngine.ScreenManager;

import com.brm.GoatEngine.ECS.common.ScriptSystem;
import com.brm.GoatEngine.ECS.core.ECSManager;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.GoatEngine;

public abstract class GameScreen{

    protected ECSManager ecsManager = new ECSManager();

    public GameScreen(){}

    public void pause() {}

    public void init(GameScreenManager engine) {
        // The Default Script System
        GoatEngine.eventManager.addListener(this.ecsManager.getSystemManager());
        ecsManager.getSystemManager().addSystem(ScriptSystem.class, new ScriptSystem());
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
