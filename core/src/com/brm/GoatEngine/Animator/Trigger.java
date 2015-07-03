package com.brm.GoatEngine.Animator;

/**
 * It is a boolean resetting itself to false when processed (used)
 */
public class Trigger{

    private Boolean value = false;


    public Boolean getValue() {
        return value;
    }

    public void setValue(Boolean value) {
        this.value = value;
    }
}
