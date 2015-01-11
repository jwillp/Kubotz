package com.brm.Kubotz.Input;

import com.badlogic.gdx.Input;

/**
 * Used to inquire for the input of the user
 * this is done on a physical game pad and not a virtual one.
 * This is the place to change controls settings
 */
public class UserInput {

    // D-PAD
    public static int MOVE_UP = Input.Keys.W;
    public static int MOVE_LEFT = Input.Keys.A;
    public static int MOVE_DOWN = Input.Keys.S;
    public static int MOVE_RIGHT = Input.Keys.D;


    public static int START = Input.Keys.ESCAPE;

    public static int PRIMARY_ACTION_BUTTON = Input.Keys.I;
    public static int SECONDARY_ACTION_BUTTON = Input.Keys.SPACE;
    public static int PUNCH = Input.Keys.O;
    public static int ACTIVE_SKILL = Input.Keys.SHIFT_LEFT;


}
