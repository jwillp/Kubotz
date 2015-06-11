package com.brm.Kubotz.Features.DroneGauntlet.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when a Drone is spawned
 */
public class DroneSpawnedEvent extends Event {

    /**
     *
     * @param entityId the drone spawned
     */
    public DroneSpawnedEvent(String entityId) {
        super(entityId);
    }


}
