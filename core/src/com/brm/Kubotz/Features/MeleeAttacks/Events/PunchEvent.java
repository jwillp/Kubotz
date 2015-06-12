package com.brm.Kubotz.Features.MeleeAttacks.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity punches something
 */
public class PunchEvent extends Event {
    /**
     *
     * @param entityId the entity punching
     */
    public PunchEvent(String entityId) {
        super(entityId);
    }
}
