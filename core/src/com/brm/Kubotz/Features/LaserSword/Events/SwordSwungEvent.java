package com.brm.Kubotz.Features.LaserSword.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an Entity swings a sword
 */
public class SwordSwungEvent extends Event {

    /**
     *
     * @param entityId the entity swinging the sword
     */
    public SwordSwungEvent(String entityId) {
        super(entityId);
    }
}
