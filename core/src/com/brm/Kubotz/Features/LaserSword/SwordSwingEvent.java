package com.brm.Kubotz.Features.LaserSword;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an Entity swings a sword
 */
public class SwordSwingEvent extends EntityEvent {

    /**
     *
     * @param entityId the entity swinging the sword
     */
    public SwordSwingEvent(String entityId) {
        super(entityId);
    }
}
