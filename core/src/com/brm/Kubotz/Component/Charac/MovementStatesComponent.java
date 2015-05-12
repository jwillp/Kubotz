package com.brm.Kubotz.Component.Charac;


import com.brm.GoatEngine.ECS.Components.StateComponent;

/**
 * The possible states of an object describing a movement
 */
public class MovementStatesComponent extends StateComponent {

    public final static String ID = "MOVEMENT_STATE_COMPONENT";

    public enum State implements EntityState{

        //Generic: On Ground
        IDLE,
        RUNNING_LEFT,
        RUNNING_RIGHT,

        JUMPING,
        FALLING,
        LANDING,

        //Dashing
        DASHING_UP,
        DASHING_DOWN,
        DASHING_LEFT,
        DASHING_RIGHT,

        //Flying
        FLYING_UP,
        FLYING_DOWN,
        FLYING_LEFT,
        FLYING_RIGHT,



    }
}
