package com.brm.Kubotz.Components.Movements;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;

/**
 * Lets an Entity Fly i.e. it is not affected by Gravity
 * (Flying platforms will have this for instance)
 */
public class FlyComponent extends EntityComponent {

    public static String ID =  "FLY_COMPONENT";

    private Vector2 acceleration = new Vector2(1.3f,1.3f);
    private Vector2 deceleration = new Vector2(0.9999999999999f, 0.9999999999999f);
    private final Vector2 MAX_SPEED = new Vector2(18f, 18f);


    public Vector2 getAcceleration() {
        return acceleration;
    }

    public void setAcceleration(Vector2 acceleration) {
        this.acceleration = acceleration;
    }

    public Vector2 getDeceleration() {
        return deceleration;
    }

    public void setDeceleration(Vector2 deceleration) {
        this.deceleration = deceleration;
    }

    public Vector2 getMaxSpeed() {
        return MAX_SPEED;
    }
}

