package com.brm.Kubotz.Component.Powerups;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Represents a Powerup
 */
public class PowerUp {

    public PowerUpEffect effect;

    public Timer effectDuration = new Timer(Timer.FIVE_SECONDS);


    public PowerUp(PowerUpEffect effect){
        this.effect = effect;
        effectDuration.start();
    }

}
