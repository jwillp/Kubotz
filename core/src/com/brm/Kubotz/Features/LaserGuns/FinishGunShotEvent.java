package com.brm.Kubotz.Features.LaserGuns;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity finishes a gun shot
 */
public class FinishGunShotEvent extends EntityEvent {

    /**
     *
     * @param entityId the entity
     */
    public FinishGunShotEvent(String entityId) {
        super(entityId);
    }
}