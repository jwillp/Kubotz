package com.brm.Kubotz.GameScreens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.brm.GoatEngine.MusicManager;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;

/**
 * LoadingScreen, more like a fake loading for now
 */
public class LoadingScreen extends GameScreen {

    private OrthographicCamera camera;
    private SpriteBatch spriteBatch;
    private Viewport viewport;


    private Texture background;
    private Timer timer = new Timer(Timer.FIVE_SECONDS);



    @Override
    public void init(GameScreenManager engine) {
        this.spriteBatch = new SpriteBatch();
        camera = new OrthographicCamera(Config.V_WIDTH, Config.V_HEIGHT);
        viewport = new FitViewport(Config.V_WIDTH, Config.V_HEIGHT, camera);

        int rand = MathUtils.random(0,1);
        switch (rand){

            case 0:
                background = new Texture(Gdx.files.internal("screens/loading/LaserGunMkI.png"));
                break;

            case 1:
                background = new Texture(Gdx.files.internal("screens/loading/fireGauntlet.png"));
                break;
        }

    }

    @Override
    public void cleanUp() {
        MusicManager.getMusic("audio/dashboard.ogg").stop();

    }

    @Override
    public void resume() {

    }

    @Override
    public void handleInput(GameScreenManager engine) {

    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {
        viewport.update(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        if(timer.isDone()){
            engine.changeScreen(new InGameScreen());
        }
    }

    @Override
    public void draw(GameScreenManager engine, float deltaTime) {
        spriteBatch.setProjectionMatrix(camera.combined);
        spriteBatch.begin();
        spriteBatch.draw(this.background, 0-Config.V_WIDTH/2,0-Config.V_HEIGHT/2, Config.V_WIDTH, Config.V_HEIGHT);
        spriteBatch.end();
    }
}
