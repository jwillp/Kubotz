package com.brm.Kubotz.Component.Skills;

import com.brm.GoatEngine.Utils.Timer;

public abstract class ActiveSkill extends SkillComponent {

    protected Timer coolDownTimer; //How long between calls of the property


    /**
     * CTOR
     * @param cooldownDelay : the delay of the cool down
     */
    protected ActiveSkill(int cooldownDelay){
        coolDownTimer = new Timer(cooldownDelay);
        coolDownTimer.start();
    }




    public Timer getCoolDownTimer() {
        return coolDownTimer;
    }

    public void setCoolDownTimer(Timer coolDownTimer) {
        this.coolDownTimer = coolDownTimer;
    }


}
