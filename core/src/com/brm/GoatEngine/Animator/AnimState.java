package com.brm.GoatEngine.Animator;

import java.util.ArrayList;

/**
 * An animation state
 */
public class AnimState{

    private String animation;
    private int playbackSpeed = 1;
    private ArrayList<Transition> transitions = new ArrayList<Transition>();

    public AnimState(String animation){
        this.animation = animation;
    }


    public AnimState addTransition(Transition t){
        this.transitions.add(t);
        return this;
    }

    public AnimState addTransition(AnimState nextState, Condition condition){
        this.transitions.add(new Transition(this, nextState, condition));
        return this;
    }


    public ArrayList<Transition> getTransitions() {
        return transitions;
    }

    public String getAnimation() {
        return animation;
    }




}
