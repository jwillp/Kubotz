package com.brm.Kubotz.Components.Movements;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Enables an entity to dash
 * The Dash movement can be divided into 4 phases
 * Preparation Phase: The entity levitates for a certain amount of time (charging the levitation)
 * Travel Phase: The actual high speed movement of the dash
 * Deceleration Phase: The speed is progressively reduced to 0
 */
public class DashComponent extends EntityComponent {
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

    private Phase phase = Phase.NONE;

    private Vector2 distance = new Vector2(10,10); // The distance in nb of game units a Dash can travel
    private Vector2 speed = new Vector2(2000,2000);    // The Speed of the Dash

    private Vector2 startPosition;   //The position of the entity at the beginning of the dash

    //The direction in which we are dashing
    // -1 <= x <= 1 ==> -1 == Left AND 1 == Right
    //-1 <= y <= 1 ==>  -1 == Down AND 1 == Up
    // 0 means static
    private Vector2 direction = new Vector2(0,0);


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


    public Phase getPhase() {
        return phase;
    }

    public void setPhase(Phase phase) {
        this.phase = phase;
    }

    public Vector2 getDistance() {
        return distance;
    }

    public void setDistance(Vector2 distance) {
        this.distance = distance;
    }

    public Vector2 getSpeed() {
        return speed;
    }

    public void setSpeed(Vector2 speed) {
        this.speed = speed;
    }

    public Vector2 getStartPosition() {
        return startPosition;
    }

    public void setStartPosition(Vector2 startPosition) {
        this.startPosition = startPosition;
    }

    public Vector2 getDirection() {
        return direction;
    }

    public void setDirection(Vector2 direction) {
        this.direction = direction;
    }




}
