package com.brm.Kubotz;

import com.badlogic.gdx.Input;

/**
 * Used to inquire for the input
 */
public class ActionInput {

    // Movement
    public static int JUMP = Input.Keys.W;
    public static int MOVE_LEFT = Input.Keys.A;
    public static int MOVE_DOWN = Input.Keys.S;
    public static int MOVE_RIGHT = Input.Keys.D;

    // Attacks
    public static int PRIMARY_ATTACK = Input.Buttons.LEFT;
    public static int SECONDARY_ATTACK = Input.Buttons.RIGHT;
    public static int SPECIAL_ATTACK = Input.Keys.Q;

}
