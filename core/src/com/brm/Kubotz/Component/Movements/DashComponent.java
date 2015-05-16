package com.brm.Kubotz.Component.Movements;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Enables an entity to dash
 * The Dash movement can be divided into 4 phases
 * Preparation Phase: The entity levitates for a certain amount of time (charging the levitation)
 * Travel Phase: The actual high speed movement of the dash
 * Deceleration Phase: The speed is progressively reduced to 0
 */
public class DashComponent extends Component{
    public final static String ID = "DASH_COMPONENT";

    public final static int LEFT = -1;
    public final static int RIGHT = 1;
    public final static int DOWN = -1;
    public final static int UP = 1;



    public enum Phase{
        PREPARATION,
        TRAVEL,
        DECELERATION,
        DONE,   // The dash executed successfully
        NONE, // The dash has not been started
    }

    public Phase phase = Phase.NONE;

    public Vector2 distance = new Vector2(10,10); // The distance in nb of game units a Dash can travel
    public Vector2 speed = new Vector2(2000,2000);    // The Speed of the Dash

    public Vector2 startPosition;   //The position of the entity at the beginning of the dash

    //The direction in which we are dashing
    // -1 <= x <= 1 ==> -1 == Left AND 1 == Right
    //-1 <= y <= 1 ==>  -1 == Down AND 1 == Up
    // 0 means static
    public Vector2 direction = new Vector2(0,0);


    private Timer preparationDuration = new Timer(200);  // The time it takes for the preparation phase to be completed
    private Timer travelDuration = new Timer(800);       // The amount of time the travel phase lasts
    private Timer recoveryDuration = new Timer(Timer.nbSeconds(2)); //The minimum recovery phase time




    public DashComponent(){
        preparationDuration.start();
        travelDuration.start();
        recoveryDuration.start();
    }


    public Timer getPreparationDuration() {
        return preparationDuration;
    }
    public Timer getTravelDuration() {
        return travelDuration;
    }
    public Timer getRecoveryDuration() {
        return recoveryDuration;
    }






}
