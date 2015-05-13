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

    private PowerUp powerUp;


    public PowerUpComponent(PowerUp powerUp){
        this.powerUp = powerUp;
    }

    public PowerUp getPowerUp() {
        return powerUp;
    }

    public void setPowerUp(PowerUp powerUp) {
        this.powerUp = powerUp;
    }
}
