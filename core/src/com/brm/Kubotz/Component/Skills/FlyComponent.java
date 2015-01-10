package com.brm.Kubotz.Component.Skills;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Lets an Entity Fly i.e. it is not affected by Gravity
 * (Flying platforms will have this for instance)
 */
public class FlyComponent extends SkillComponent {

    public static String ID =  "FLY_PROPERTY";

    private Timer coolDown; //How long between calls of the property
    private Timer duration; //Timing how long the flying has been used


    public FlyComponent(int coolDownDelay, int maxFlyDuration){
        super(coolDownDelay, maxFlyDuration);
    }


    public Timer getCoolDown() {
        return coolDown;
    }

    public void setCoolDown(Timer coolDown) {
        this.coolDown = coolDown;
    }

    public Timer getDuration() {
        return duration;
    }

    public void setDuration(Timer duration) {
        this.duration = duration;
    }
}
