package com.brm.GoatEngine.Animator;

/**
 * A parameter for changing states
 */
public class Parameter{

    Class type;
    Object value;

    public Parameter(Class type){
        this.type = type;
    }

    public void setValue(Object value){
        this.value = value;
    }

    public Object getValue(){
        return this.value;
    }

}
