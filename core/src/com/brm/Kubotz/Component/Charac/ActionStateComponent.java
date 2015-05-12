package com.brm.Kubotz.Component.Charac;

import com.brm.GoatEngine.ECS.Components.StateComponent;

/**
 * The Action states containing attacks and other actions like
 * picking up an object, throwing away an object
 * Protecting,
 * Shooting,
 * Using sword
 *
 * These actions might happen in parallel with the MovementStates
 */
public class ActionStateComponent extends StateComponent{
    public final static String ID = "ACTION_STATE_COMPONENT";


    public enum State{


        HIT,        // Getting Hit

        PUNCHING,     // Throwing a punch
        SHOOTING,     // Shooting with a gun
        USING_SWORD,  // Throwing a sword slash

        PICKING_UP_OBJECT,
        THROWING_OBJECT,
    }





}
