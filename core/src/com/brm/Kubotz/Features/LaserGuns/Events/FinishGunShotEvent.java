package com.brm.Kubotz.Features.LaserGuns.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity finishes a gun shot
 */
public class FinishGunShotEvent extends Event {

    /**
     *
     * @param entityId the entity
     */
    public FinishGunShotEvent(String entityId) {
        super(entityId);
    }
}