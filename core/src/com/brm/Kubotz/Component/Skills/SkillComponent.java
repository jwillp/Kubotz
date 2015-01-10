package com.brm.Kubotz.Component.Skills;

import com.brm.GoatEngine.Utils.Timer;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used for Skills Property
 */
public abstract class SkillComponent extends Component {

    private Timer coolDown; //How long between calls of the property
    private Timer duration; //Timing how long the skill has been used

    /**
     *
     * @param coolDownDelay: in seconds
     * @param maxDuration: in seconds
     */
    public SkillComponent(int coolDownDelay, int maxDuration){
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
