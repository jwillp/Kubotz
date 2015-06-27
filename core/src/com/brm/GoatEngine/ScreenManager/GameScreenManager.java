package com.brm.GoatEngine.ScreenManager;


import com.badlogic.gdx.assets.AssetManager;
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
        Logger.info("Game Engine Init::Loading Resources");


        //Graphical Interface initSystems
        Logger.info("Game Engine Init::GUI Initialisation");
    }

    /**
     * Does necessary clean ups of the engine
     */
    public void cleanUp() {
        Logger.info("Game Engine Cleaning Up");
    }


    /**
     * Exits the engine in a clean way
     */
    public  void exit(){
        Logger.info("Game Engine Exiting");
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
        Logger.info("Game Engine adding Screen ...");
        if(!this.screens.isEmpty())
            this.screens.peek().pause();

        this.screens.push(screen);
        this.screens.peek().init(this);
        Logger.info("Game Engine Screen Added");
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
            throw new EmptyScreenManagerException();
        }

    }

    public void update(float deltaTime) {
        if(!this.screens.empty()){
            this.screens.peek().update(this, deltaTime);

        }else{
            throw new EmptyScreenManagerException();
        }

    }

    public void draw(float deltaTime) {
        if(!this.screens.empty()){
            this.screens.peek().draw(this, deltaTime);
        }else{
            throw new EmptyScreenManagerException();
        }
    }


    /**
     * Pauses the whole manager until it resumes
     */
    public void pause(){
        this.isRunning = false;
    }

    /**
     * Resumes the manager after a pause
     */
    public void resume(){
        this.isRunning = true;
    }

    public GameScreen getCurrentScreen() {
        if(!this.screens.empty()){
            return this.screens.peek();
        }else{
            throw new EmptyScreenManagerException();
        }
    }


    public class EmptyScreenManagerException extends RuntimeException{

        public EmptyScreenManagerException(){
            super("There is no Game Screen in the Screen Manager's stack");
        }
    }






}
