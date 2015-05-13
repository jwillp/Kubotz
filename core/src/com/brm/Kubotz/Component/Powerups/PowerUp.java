package com.brm.Kubotz.Component.Powerups;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Represents a Powerup
 */
public class PowerUp {

    public enum Type{

        HealthModifier,
        EnergyModifier,
        SpeedModifier,

        InvincibilityProvider,      // NO DAMAMGE
        ShieldProvider,
        InvisibilityProvider,       // NO visible
    }
    public Type type;

    public PowerUpEffect effect;

    public Timer effectTimer;


    public PowerUp(PowerUpEffect effect){
        this.effect = effect;
        effectTimer.start();
    }
}
