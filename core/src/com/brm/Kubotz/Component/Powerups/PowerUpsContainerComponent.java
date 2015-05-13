package com.brm.Kubotz.Component.Powerups;

import java.util.ArrayList;

/**
 * Used for an entity to have PowerUps
 */
public class PowerUpsContainerComponent {


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

}
