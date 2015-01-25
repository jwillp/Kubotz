package com.brm.Kubotz.Component.Skills;


import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Skills.ActiveSkill;

public class DurationBasedSkill extends ActiveSkill {


    protected Timer effectDurationTimer; //Timing how long the skill has been used

    /**
     *
     * @param coolDownDelay: in seconds
     * @param maxDuration: in seconds
     */
    public DurationBasedSkill(int coolDownDelay, int maxDuration){
        super(coolDownDelay);
        this.setCoolDownTimer(new Timer(coolDownDelay));
        this.setEffectDurationTimer(new Timer(maxDuration));

        this.getCoolDownTimer().start();
        this.getEffectDurationTimer().start();
    }


    public Timer getEffectDurationTimer() {
        return effectDurationTimer;
    }

    public void setEffectDurationTimer(Timer effectDurationTimer) {
        this.effectDurationTimer = effectDurationTimer;
    }




}
