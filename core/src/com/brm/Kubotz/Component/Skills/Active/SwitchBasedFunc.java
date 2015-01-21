package com.brm.Kubotz.Component.Skills.Active;


import com.brm.GoatEngine.Utils.Timer;

public class SwitchBasedFunc extends ActiveFunctionality{

    protected Timer coolDownTimer; //How long between calls of the property
    protected Timer effectDurationTimer; //Timing how long the skill has been used

    /**
     *
     * @param coolDownDelay: in seconds
     * @param maxDuration: in seconds
     */
    public SwitchBasedFunc(int coolDownDelay, int maxDuration){
        this.setCoolDownTimer(new Timer(coolDownDelay));
        this.setEffectDurationTimer(new Timer(maxDuration));

        this.getCoolDownTimer().start();
        this.getEffectDurationTimer().start();

    }

    public Timer getCoolDownTimer() {
        return coolDownTimer;
    }

    public void setCoolDownTimer(Timer coolDownTimer) {
        this.coolDownTimer = coolDownTimer;
    }

    public Timer getEffectDurationTimer() {
        return effectDurationTimer;
    }

    public void setEffectDurationTimer(Timer effectDurationTimer) {
        this.effectDurationTimer = effectDurationTimer;
    }

}
