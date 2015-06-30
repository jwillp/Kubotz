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


    public void addTransition(Transition t){
        this.transitions.add(t);
    }




}
