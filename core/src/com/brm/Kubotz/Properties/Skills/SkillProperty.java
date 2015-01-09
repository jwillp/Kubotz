package com.brm.Kubotz.Properties.Skills;

import com.brm.GoatEngine.Utils.Timer;
import com.brm.GoatEngine.ECS.Properties.Property;

/**
 * Used for Skills Property
 */
public abstract class SkillProperty extends Property {

    private Timer coolDown; //How long between calls of the property
    private Timer duration; //Timing how long the skill has been used

    /**
     *
     * @param coolDownDelay: in seconds
     * @param maxDuration: in seconds
     */
    public SkillProperty(int coolDownDelay, int maxDuration){
        this.setCoolDown(new Timer(coolDownDelay));
        this.setDuration(new Timer(maxDuration));
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
