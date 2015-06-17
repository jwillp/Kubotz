package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.EventManager.EventManager;
import com.brm.GoatEngine.GraphicsEngine.GraphicsEngine;
import com.brm.GoatEngine.Konsole.ConsoleCommandeExecutor;
import com.brm.GoatEngine.Konsole.Konsole;
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

    private static GoatEngine instance = null;

    //Scripting Engine
    private ScriptingEngine scriptEngine;

    //ScreenManager
    private GameScreenManager gameScreenManager; //This is where the real "Game" is happening

    private EventManager eventManager;

    private MusicManager musicManager;

    private InputManager inputManager;

    private Konsole console;

    private GraphicsEngine graphicsEngine;





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

        //Graphics Engine
        graphicsEngine = new GraphicsEngine();


        //Init the console
        setConsole(new Konsole());
        getConsole().setCommandExecutor(new ConsoleCommandeExecutor());
        getConsole().log("Console inited", Console.LogLevel.SUCCESS);

        setMusicManager(new MusicManager());
        setInputManager(new InputManager());

        //Script Engine Init
        setScriptEngine(new ScriptingEngine());
        scriptEngine.init();

        //Game Screen manager
        setGameScreenManager(new GameScreenManager());
        getGameScreenManager().init();


        // Event Manager
        eventManager = new EventManager();



        // RUN DEFAULT MAIN SCRIPT
        try{
            scriptEngine.runScript(scriptEngine.loadScript("scripts/main.js"));
        }catch(Exception e){
            getConsole().log(e.getMessage(), Console.LogLevel.ERROR);
        }


    }


    /**
     * Updates the engine for ONE frame
     */
    public void update(){
        float deltaTime = Gdx.graphics.getDeltaTime();

        //Script Engine
        //TODO Update?

        //Clears the screen
        graphicsEngine.clearScreen();

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

    public ScriptingEngine getScriptEngine() {
        return scriptEngine;
    }

    public void setScriptEngine(ScriptingEngine scriptEngine) {
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

    public EventManager getEventManager() {
        return eventManager;
    }
}
