package com.brm.Kubotz.Components.Powerups;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Represents a Powerup
 */
public class PowerUp {

    private PowerUpEffect effect;

    private Timer effectDuration = new Timer(Timer.FIVE_SECONDS);


    public PowerUp(PowerUpEffect effect){
        this.effect = effect;
        effectDuration.start();
    }

    public PowerUpEffect getEffect() {
        return effect;
    }

    public void setEffect(PowerUpEffect effect) {
        this.effect = effect;
    }

    public Timer getEffectDuration() {
        return effectDuration;
    }

    public void setEffectDuration(Timer effectDuration) {
        this.effectDuration = effectDuration;
    }
}
