package com.brm.GoatEngine.AI.BehaviourTree;

import java.util.Hashtable;

/**
* Child are evaluated one by one (from left to right)
* When it is finished, the next one is validated and executed
* If one fails, the Sequence fails
*
* SUCCESS : all children return SUCCESS
* FAILED  : as soon as any of the children returns FAILURE
* RUNNING : as soon as any of the children returns RUNNING
* */
public class Sequence extends Composite {

    public Sequence(){
        this.currentNode = 0;
    }

    public Sequence(Hashtable<String, Object> blackBoard){
        this.currentNode = 0;
        this.setBlackBoard(blackBoard);
    }
    
    public State update() {
        
        State state = State.RUNNING;
        while(state == State.RUNNING){
            state = this.children.get(currentNode).tick();
            if(state != State.SUCCESS) {
                this.currentNode = 0; //reset
                return state;
            }
            
             if( (currentNode + 1) != children.size() ){
                 currentNode++;
             } else { break; }
        } 
        return State.SUCCESS;
    }
    
}
