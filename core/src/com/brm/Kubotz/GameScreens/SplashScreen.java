package com.brm.Kubotz.GameScreens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.brashmonkey.spriter.Spriter;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterDrawer;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterLoader;
import com.brm.GoatEngine.ECS.common.HealthComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.DynamoFactory;


public class SplashScreen extends GameScreen {

    protected SpriteBatch spriteBatch = new SpriteBatch();
    protected ShapeRenderer shapeRenderer = new ShapeRenderer();


    @Override
    public void init(GameScreenManager engine) {

        Spriter.setDrawerDependencies(this.spriteBatch,this.shapeRenderer);
        Spriter.init(LibGdxSpriterLoader.class, LibGdxSpriterDrawer.class);
        Spriter.load(Gdx.files.internal(Constants.KUBOTZ_ANIM_FILE).read(), Constants.KUBOTZ_ANIM_FILE);



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
