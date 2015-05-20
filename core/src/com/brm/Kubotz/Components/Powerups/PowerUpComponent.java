package com.brm.Kubotz.Components.Powerups;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * Makes an entity a powerup
 *
 *  There are two main types of modifiers:
 *      - Usable: Usally gives a new weapon to the entity using the powerup
 *      - *Edible*: Usally modify an entity variable (speed, energy, health)
 *
 */
public class PowerUpComponent extends EntityComponent {

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
