package com.brm.Kubotz.Input;

import com.badlogic.gdx.Input;

/**
 * Used to inquire for the input of the user
 * this is done on a physical game pad and not a virtual one.
 * This is the place to change controls settings.
 * This maps the buttons to intent variables.
 * This intent can later be
 */
public class UserInput {


    public static int DPAD_UP = Input.Keys.W;
    public static int DPAD_LEFT = Input.Keys.A;
    public static int DPAD_DOWN = Input.Keys.S;
    public static int DPAD_RIGHT = Input.Keys.D;

    public static int START = Input.Keys.ESCAPE;

    public static int BUTTON_A = Input.Keys.O;
    public static int BUTTON_B = Input.Keys.I;

    public static int BUTTON_X = Input.Keys.SHIFT_LEFT;
    public static int BUTTON_Y = Input.Keys.SPACE;




}
