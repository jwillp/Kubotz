package com.brm.GoatEngine.ScreenManager;


import com.brm.GoatEngine.Utils.Logger;

import java.util.Stack;

/**
 *
 * @author fireraccoon
 *
 *  We have a stack of states so we play the state at the top of the list
 *
 */
public class GameScreenManager {

    // ATTRIBUTES //
    private Stack<GameScreen> states = new Stack<GameScreen>();
    private boolean isRunning;



    // METHODS //

    /**
     * Initialises the Engine
     */
    public void init() {

        this.isRunning = true;
        //Load Ressources from manager
        Logger.log("Game Engine Init::Loading Resources");


        //Graphical Interface init
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


    // State Management //
    public void changeState(GameScreen state){

        if(!this.states.isEmpty()){
            this.states.peek().cleanUp();
            this.states.pop(); //We delete it;
        }
        this.states.push(state);
        this.states.peek().init(this);

    }
    /**
     * Adds a state on top of the list , so it poses the currently running state
     * @param state
     */
    public void addState(GameScreen state){
        Logger.log("Game Engine adding State ...");
        if(!this.states.isEmpty())
            this.states.peek().pause();

        this.states.push(state);
        this.states.peek().init(this);
        Logger.log("Game Engine State Added");
    }


    /**
     * delete last game state in the stack
     */
    public void popState(){

        if(!this.states.isEmpty()){
            this.states.peek().cleanUp();
            this.states.pop();
        }
        //if we still have another state we resume it
        if(!this.states.isEmpty()){
            this.states.peek().resume();
        }
    }


    // LOOP //
    public void handleEvents() {
        if(!this.states.empty()){
            this.states.peek().handleInput(this);
        }else{
            this.exitWithError("Game Engine handle events::There is no state in the engine's stack.");
        }

    }

    public void update(float deltaTime) {
        if(!this.states.empty()){
            this.states.peek().update(this, deltaTime);

        }else{
            this.exitWithError("Game Engine Update::There is no state in the engine's stack.");
        }

    }

    public void draw() {
        if(!this.states.empty()){
            this.states.peek().draw(this);
        }else{
            this.exitWithError("Game Engine Draw::There is no state in the engine's stack.");
        }
    }



}
