package com.brm.GoatEngine.AI.BehaviourTree;

/**
*  Check which child to run in priority order until the
*  first one succeeds or returns that it is running.
*  The order of children counts
*
*  STATES
*  SUCCESS : as soon as any of the children returns SUCCESS
*  FAILED  : if all children return FAILED
*  RUNNING : as soon as any of the children returns RUNNING
**/
public class Selector extends Composite {
    
    
    public Selector(){
      currentNode = (0);
    }

    @Override
    public State update() {
        
        State state = State.RUNNING;
        
        while(state == State.RUNNING){
            state = children.get(currentNode).tick();
            
            if(state == State.SUCCESS || state == State.RUNNING ) {
                this.currentNode = 0; //reset
                return state;
            } 
            
           
            if( (currentNode + 1) != children.size() ){
                currentNode++;
            } else { break; }
        }
        
        
        return State.FAILED;
    }
    
   
    
    
    
    
    
    
}
