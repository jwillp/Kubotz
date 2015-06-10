package com.brm.Kubotz.AI.BehaviourTree;

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

    public State update(Hashtable<String, Object> blackBoard) {
        State state;
        for(Node node: this.children){
            state = node.tick(blackBoard);
            if(state == State.RUNNING){
                return State.RUNNING;
            }else if(state == State.FAILED){
                return  State.FAILED;
            }
        }
        return State.SUCCESS;
    }
}