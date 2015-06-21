package com.brm.Kubotz.GameScreens;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.brm.GoatEngine.ECS.common.HealthComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.DynamoFactory;
import com.strongjoshua.console.Console;

import java.awt.*;


public class SplashScreen extends GameScreen {

    protected SpriteBatch spriteBatch;


    @Override
    public void init(GameScreenManager engine) {

        Entity e = DynamoFactory.createEntity("blueprint/Kubotz.xml", this.getEntityManager());
        int components = getEntityManager().getComponentsForEntity(e.getID()).size();
        GoatEngine.console.log("NUMBER OF COMPONENTS: " + components);

        GoatEngine.console.log("HAS COMPONENT HEALTH: " + e.hasComponent(HealthComponent.ID));

    }

    @Override
    public void cleanUp() {

    }

    @Override
    public void resume() {

    }

    @Override
    public void handleInput(GameScreenManager engine) {

    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {

    }

    @Override
    public void draw(GameScreenManager engine, float deltaTime) {

           // Logger.log(" SPLASH SCREEN DRAW CALL");
    }



}
