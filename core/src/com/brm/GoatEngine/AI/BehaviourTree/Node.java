package com.brm.GoatEngine.AI.BehaviourTree;

import java.util.Hashtable;

/**
 *
 * @author FireRaccoon
 */
public abstract class Node {

    /**
     * The possible states of a node
     */
    public enum State{
       INVALID,  //Needs a precondition in order to be executed
        SUCCESS, //Success at executing
        FAILED,  //Failed at executing
        RUNNING  //Has not finished yet (needs another tick)
    }
    
    
    protected  State state;
    protected Hashtable<String, Object> blackBoard = new Hashtable<String, Object>();

    /**
     * Updates the state of a node
     * @return
     */
    public abstract State update();

    /**
     * Precondition in order for the node to be updated
     * @return
     */
    public boolean precondition(){ return true; }

    /**
     * Called when a node is initialized
     */
    public void onInitialize(){}

    /**
     * Called when a node is Terminated
     * @param state
     */
    public void onTerminate(State state){}

    /**
     * Main method for a loop
     * @return
     */
    public State tick(){
        
        if(!precondition()){
            return State.FAILED;
        }

        
        if(state == State.INVALID) {
            onInitialize();
        }
        
        
        state = update();
        
        if(state != State.RUNNING)
            onTerminate(state);
            
         return state;   
    }
    
    
    /**
     * @return the blackBoard
     */
    public Hashtable<String, Object> getBlackBoard() {
        return blackBoard;
    }

    /**
     * @param blackBoard the blackBoard to set
     */
    public void setBlackBoard(Hashtable<String, Object> blackBoard) {
        this.blackBoard = blackBoard;
    }
    
    
    
    
}
