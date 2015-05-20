package com.brm.GoatEngine.ScreenManager;


import com.brm.GoatEngine.Utils.Logger;

import java.util.Stack;

/**
 *
 * @author fireraccoon
 *
 *  We have a stack of screens so we play the screen at the top of the list
 *
 */
public class GameScreenManager {

    // ATTRIBUTES //
    private Stack<GameScreen> screens = new Stack<GameScreen>();
    private boolean isRunning;



    // METHODS //

    /**
     * Initialises the Engine
     */
    public void init() {

        this.isRunning = true;
        //Load Ressources from manager
        Logger.log("Game Engine Init::Loading Resources");


        //Graphical Interface initSystems
        Logger.log("Game Engine Init::GUI Initialisation");


    }

    /**
     * Does necessary clean ups of the engine
     */
    public void cleanUp() {
        Logger.log("Game Engine Cleaning Up");
    }

    public void exitWithError(String error){
        System.out.println(error);
        System.exit(1);
    }

    /**
     * Exits the engine in a clean way
     */
    public  void exit(){
        Logger.log("Game Engine Exiting");
        this.isRunning = false;

    }

    public boolean isRunning() {
        return this.isRunning;
    }


    // Screen Management //
    public void changeScreen(GameScreen screen){

        if(!this.screens.isEmpty()){
            this.screens.peek().cleanUp();
            this.screens.pop(); //We delete it;
        }
        this.screens.push(screen);
        this.screens.peek().init(this);

    }
    /**
     * Adds a screen on top of the list , so it poses the currently running screen
     * @param screen
     */
    public void addScreen(GameScreen screen){
        Logger.log("Game Engine adding Screen ...");
        if(!this.screens.isEmpty())
            this.screens.peek().pause();

        this.screens.push(screen);
        this.screens.peek().init(this);
        Logger.log("Game Engine Screen Added");
    }


    /**
     * delete last game screen in the stack
     */
    public void popScreen(){

        if(!this.screens.isEmpty()){
            this.screens.peek().cleanUp();
            this.screens.pop();
        }
        //if we still have another screen we resume it
        if(!this.screens.isEmpty()){
            this.screens.peek().resume();
        }
    }


    // LOOP //
    public void handleEvents() {
        if(!this.screens.empty()){
            this.screens.peek().handleInput(this);
        }else{
            this.exitWithError("Game Engine handle events::There is no screen in the engine's stack.");
        }

    }

    public void update(float deltaTime) {
        if(!this.screens.empty()){
            this.screens.peek().update(this, deltaTime);

        }else{
            this.exitWithError("Game Engine Update::There is no screen in the engine's stack.");
        }

    }

    public void draw(float deltaTime) {
        if(!this.screens.empty()){
            this.screens.peek().draw(this, deltaTime);
        }else{
            this.exitWithError("Game Engine Draw::There is no screen in the engine's stack.");
        }
    }



}
