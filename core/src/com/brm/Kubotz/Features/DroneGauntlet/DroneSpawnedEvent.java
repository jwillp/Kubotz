package com.brm.Kubotz.Features.DroneGauntlet;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when a Drone is spawned
 */
public class DroneSpawnedEvent extends EntityEvent {

    /**
     *
     * @param entityId the drone spawned
     */
    public DroneSpawnedEvent(String entityId) {
        super(entityId);
    }


}
