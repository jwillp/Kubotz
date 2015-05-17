package com.brm.Kubotz.Components.Powerups;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

import java.util.ArrayList;

/**
 * Used for an entity to have PowerUps
 */
public class PowerUpsContainerComponent extends EntityComponent {

    public static final String ID = "POWER_UPS_CONTAINER_COMPONENT";

    ArrayList<PowerUp> powerUps = new ArrayList<PowerUp>();

    /**
     * Adds a powerup to the list and activates its effect
     */
    public void addPowerUp(PowerUp p){
        this.powerUps.add(p);
    }

    /**
     * Removes a powerup from the list and deactivate its effect
     */
    public void removePowerUp(PowerUp p){
        this.powerUps.remove(p);
    }


    public ArrayList<PowerUp> getPowerUps() {
        return powerUps;
    }
}
