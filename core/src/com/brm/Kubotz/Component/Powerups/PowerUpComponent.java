package com.brm.Kubotz.Component.Powerups;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Makes an entity a powerup
 *
 *  There are two main types of modifiers:
 *      - Usable: Usally gives a new weapon to the entity using the powerup
 *      - *Edible*: Usally modify an entity variable (speed, energy, health)
 *
 */
public class PowerUpComponent extends Component {

    public static final String ID = "POWERUP_COMPONENT";

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



}
