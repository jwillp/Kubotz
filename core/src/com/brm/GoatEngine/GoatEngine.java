package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.strongjoshua.console.Console;

/**
 * The base class for the whole GamEngine
 * Contains the core functions such as
 *     - init (for startup)
 *     - loop
 *     - shutdown
 *
 *     SINGLETON CLASS
 */
public class GoatEngine {


    private static GoatEngine instance = null;


    private MusicManager musicManager;

    private InputManager inputManager;

    private GameScriptEngine scriptEngine;

    private GameScreenManager gameScreenManager; //This is where the real "Game" is happening

    private Konsole console;

    // TODO Global Event Manager?

    // TODO NetworkManager ?



    public static GoatEngine get(){
        if(instance == null){
            instance = new GoatEngine();
        }
        return instance;
    }



    /**
     * This initializes the Game Engine
     */
    public void init(){

        setMusicManager(new MusicManager());
        setInputManager(new InputManager());
        setScriptEngine(new GameScriptEngine());

        //Game Screen manager
        setGameScreenManager(new GameScreenManager());
        getGameScreenManager().init();


        //Init the console
        setConsole(new Konsole());
        getConsole().setCommandExecutor(new ConsoleCommandeExecutor());
        getConsole().log("Console inited", Console.LogLevel.SUCCESS);
    }


    /**
     * Updates the engine for ONE frame
     */
    public void update(){
        float deltaTime = Gdx.graphics.getDeltaTime();

        //Script Engine
        //TODO Update?

        //Clears the screen
        Gdx.gl.glClearColor(0,0,0,0);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
        if(getGameScreenManager().isRunning()){
            //Game Screen Manager
            getGameScreenManager().handleEvents();
            getGameScreenManager().update(deltaTime);
        }
        getGameScreenManager().draw(deltaTime);

        //Draw Console
        getConsole().refresh();
        getConsole().draw();

    }


    public void cleanUp(){
        //GameScreen Manager
        getGameScreenManager().cleanUp();

        //Dispose Script
        getScriptEngine().dispose();

        //Dispose Console
        getConsole().dispose();
    }


    public MusicManager getMusicManager() {
        return musicManager;
    }

    public void setMusicManager(MusicManager musicManager) {
        this.musicManager = musicManager;
    }

    public InputManager getInputManager() {
        return inputManager;
    }

    public void setInputManager(InputManager inputManager) {
        this.inputManager = inputManager;
    }

    public GameScriptEngine getScriptEngine() {
        return scriptEngine;
    }

    public void setScriptEngine(GameScriptEngine scriptEngine) {
        this.scriptEngine = scriptEngine;
    }

    public GameScreenManager getGameScreenManager() {
        return gameScreenManager;
    }

    public void setGameScreenManager(GameScreenManager gameScreenManager) {
        this.gameScreenManager = gameScreenManager;
    }

    public Console getConsole() {
        return console;
    }

    public void setConsole(Konsole console) {
        this.console = console;
    }
}
