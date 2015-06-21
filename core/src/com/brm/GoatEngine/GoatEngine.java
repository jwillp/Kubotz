package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.EventManager.EventManager;
import com.brm.GoatEngine.GraphicsEngine.GraphicsEngine;
import com.brm.GoatEngine.Input.InputManager;
import com.brm.GoatEngine.Konsole.ConsoleCommandeExecutor;
import com.brm.GoatEngine.Konsole.Konsole;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.ScriptingEngine.ScriptingEngine;
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



    //Scripting Engine
    public static ScriptingEngine scriptEngine;

    //ScreenManager
    public static GameScreenManager gameScreenManager; //This is where the real "Game" is happening

    public static EventManager eventManager;

    public static MusicManager musicManager;

    public static InputManager inputManager;

    public static Konsole console;

    public static GraphicsEngine graphicsEngine;


    // TODO NetworkManager ?



    /**
     * This initializes the Game Engine
     */
    public static void init(){

        //Graphics Engine
        graphicsEngine = new GraphicsEngine();

        // Event Manager
        eventManager = new EventManager();


        //Init the console
        console = new Konsole();
        console.setCommandExecutor(new ConsoleCommandeExecutor());
        console.log("Console inited", Console.LogLevel.SUCCESS);

        musicManager = new MusicManager();
        inputManager = new InputManager();

        //Script Engine Init
        scriptEngine = new ScriptingEngine();
        scriptEngine.init();

        //Game Screen manager
        gameScreenManager = new GameScreenManager();
        gameScreenManager.init();



        // RUN DEFAULT MAIN SCRIPT
        try{
            scriptEngine.runScriptInGlobalScope(scriptEngine.loadScript("scripts/main.js"));
        }catch(Exception e){
            console.log(e.getMessage(), Console.LogLevel.ERROR);
        }

    }


    /**
     * Updates the engine for ONE frame
     */
    public static void update(){
        float deltaTime = Gdx.graphics.getDeltaTime();

        //Script Engine
        //TODO Update?

        //Clears the screen
        graphicsEngine.clearScreen();

        if(gameScreenManager.isRunning()){
            //Game Screen Manager
            gameScreenManager.handleEvents();
            gameScreenManager.update(deltaTime);
        }
        gameScreenManager.draw(deltaTime);

        //Draw Console
        console.refresh();
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
