package com.brm.GoatEngine.Animator;

/**
 * A parameter for Conditions
 */
public class Parameter{

    Comparable value;

    public Parameter(){

    }

    public void setValue(Comparable value){
        this.value = value;
    }

    public Comparable getValue(){
        return this.value;
    }

}
