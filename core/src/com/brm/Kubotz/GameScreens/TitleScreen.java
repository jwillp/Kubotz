package com.brm.Kubotz.GameScreens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Music;
import com.badlogic.gdx.controllers.Controller;
import com.badlogic.gdx.controllers.Controllers;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.brm.GoatEngine.MusicManager;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Konsole.ConsoleCommandeExecutor;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Input.ControllerMap;
import com.brm.Kubotz.Input.DiaronControllerMap;
import com.brm.Kubotz.Input.Xbox360ControllerMap;
import com.strongjoshua.console.Console;


/**
 * Title screen
 */
public class TitleScreen extends GameScreen{

    private OrthographicCamera camera;

    private SpriteBatch spriteBatch;

    private Viewport viewport;

    private Texture titleBackground = new Texture(Gdx.files.internal("screens/title/background.png"));

    private Texture btnSelected = new Texture(Gdx.files.internal("screens/title/btn_selected.png"));
    private Texture btn = new Texture(Gdx.files.internal("screens/title/btn.png"));

    public int currentSelection = 0;

    private Controller controller;

    private Console console;

    @Override
    public void init(GameScreenManager engine) {
        this.spriteBatch = new SpriteBatch();

        //init Camera
        camera = new OrthographicCamera(Config.V_WIDTH, Config.V_HEIGHT);
        viewport = new FitViewport(Config.V_WIDTH, Config.V_HEIGHT, camera);

        // Init GameControllers
        if(Config.PLAYER_1_USE_GAMEPAD){
            controller = Controllers.getControllers().first();
        }

        //Init Music
        initMusic();


        console = new Console();
        console.setCommandExecutor(new ConsoleCommandeExecutor());

        console.log("Yay!", Console.LogLevel.SUCCESS);

    }

    /**
     * Initialises the music
     */
    public void initMusic(){
        Music music;
        music = MusicManager.loadMusic("audio/dashboard.ogg", Gdx.audio.newMusic(Gdx.files.internal("audio/dashboard.ogg")));
        music.setLooping(true);
        music.play();

    }







    @Override
    public void cleanUp() {

    }

    @Override
    public void resume() {

    }

    @Override
    public void handleInput(GameScreenManager engine) {

        if(controller != null){
            handleController(engine);
        }else{
            handleKeyboard(engine);
        }

        currentSelection = MathUtils.clamp(currentSelection, 0,1);
    }

    /**
     * Handles the input in the case of a Controller
     * @param engine
     */
    private void handleController(GameScreenManager engine){
            //Determine Controller Map
            ControllerMap map = null;
            if(controller.getName().toLowerCase().contains("xbox") && controller.getName().contains("360")){
                map = new Xbox360ControllerMap();
            }else{
                map = new DiaronControllerMap();
            }

            if(controller.getButton(map.getButtonA())){
                onSelect(engine);
            }

            if(controller.getAxis(map.getAxisLeftY()) == -1){
                onCursorMoveDown();
            }
            if(controller.getAxis(map.getAxisLeftY()) == 1){
                onCursorMoveUp();
            }



    }

    /**
     * Handles the input in the case of a keyboard
     * @param engine
     */
    private void handleKeyboard(GameScreenManager engine){

        if(Gdx.input.isKeyPressed(Config.PLAYER_1_MOVE_UP)){
            onCursorMoveUp();
        }else if(Gdx.input.isKeyPressed(Config.PLAYER_1_MOVE_DOWN)){
            onCursorMoveDown();
        }else if(Gdx.input.isKeyPressed(Config.PLAYER_1_ATTACK_BUTTON)){
            onSelect(engine);
        }
    }





    /**
     * Called when a button is selected
     * @param engine
     */
    private void onSelect(GameScreenManager engine) {
        if(currentSelection == 0){
            engine.changeScreen(new LoadingScreen());
        }else{
            Gdx.app.exit();
        }
    }


    /**
     * Called when the user moves the cursor up
     */
    private void onCursorMoveUp(){
        currentSelection--;
    }

    /**
     * Called when the user moves the cursor down
     */
    private void onCursorMoveDown(){
        currentSelection++;
    }









    @Override
    public void update(GameScreenManager engine, float deltaTime) {
        viewport.update(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
    }

    @Override
    public void draw(GameScreenManager engine, float deltaTime) {
        Gdx.gl.glClearColor(0,0,0,0);
        spriteBatch.setProjectionMatrix(this.camera.combined);
        spriteBatch.begin();

        spriteBatch.draw(this.titleBackground, 0- Config.V_WIDTH/2,0-Config.V_HEIGHT/2, Config.V_WIDTH, Config.V_HEIGHT);


        //BUTTON START
        if(currentSelection == 0){
            spriteBatch.draw(this.btnSelected, 0-this.btn.getWidth()/2, 0);
        }else {
            spriteBatch.draw(this.btn, 0-this.btn.getWidth()/2, 0);
        }

        //BUTTON QUIT
        if(currentSelection == 1){
            spriteBatch.draw(this.btnSelected, 0-this.btn.getWidth()/2, -200);
        }else{
            spriteBatch.draw(this.btn, 0-this.btn.getWidth()/2, -200);
        }

        spriteBatch.end();


        console.draw();

    }



}
