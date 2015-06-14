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
 */
public class GoatEngine {

    public static MusicManager musicManager;

    public static InputManager inputManager;

    public static GameScriptEngine scriptEngine;

    public static GameScreenManager gameScreenManager; //This is where the real "Game" is happening

    public static Console console;

    // TODO Global Event Manager?

    // TODO NetworkManager ?




    /**
     * This initializes the Game Engine
     */
    public static void init(){

        musicManager = new MusicManager();
        inputManager = new InputManager();
        scriptEngine = new GameScriptEngine();

        //Game Screen manager
        gameScreenManager = new GameScreenManager();
        gameScreenManager.init();


        //Init the console
        console = new Console();
        console.setCommandExecutor(new ScriptCommandExecutor());
        console.log("Console inited", Console.LogLevel.SUCCESS);
    }


    /**
     * Updates the engine for ONE frame
     */
    public static void update(){
        float deltaTime = Gdx.graphics.getDeltaTime();

        //Script Engine
        //TODO Update?

        //Clears the screen
        Gdx.gl.glClearColor(0,0,0,0);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
        if(gameScreenManager.isRunning()){
            //Game Screen Manager
            gameScreenManager.handleEvents();
            gameScreenManager.update(deltaTime);
        }
        gameScreenManager.draw(deltaTime);

        //Draw Console
        console.draw();

    }


    public static void cleanUp(){
        //GameScreen Manager
        gameScreenManager.cleanUp();

        //Dispose Script
        scriptEngine.dispose();

        //Dispose Console
        console.dispose();
    }


}
