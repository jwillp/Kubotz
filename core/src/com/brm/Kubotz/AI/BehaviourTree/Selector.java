package com.brm.Kubotz.AI.BehaviourTree;

import java.util.Hashtable;

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

    @Override
    public State update(Hashtable<String, Object> blackBoard) {

        for(Node node: this.children){
            state = node.tick(blackBoard);
            if(state == State.RUNNING || state == State.SUCCESS){
                return state;
            }
        }
        return State.FAILED;
    }








}