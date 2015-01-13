package com.brm.Kubotz.Component.Skills;

import com.badlogic.gdx.math.Vector2;

/**
 * Lets an Entity Fly i.e. it is not affected by Gravity
 * (Flying platforms will have this for instance)
 */
public class FlyComponent extends SkillComponent {

    public static String ID =  "FLY_PROPERTY";

    public Vector2 acceleration = new Vector2(1.3f,1.3f);
    public Vector2 deceleration = new Vector2(0.9999999999999f, 0.9999999999999f);
    public final Vector2 MAX_SPEED = new Vector2(18f, 18f);



    public FlyComponent(int coolDownDelay, int maxFlyDuration){
        super(coolDownDelay, maxFlyDuration);
    }


}
