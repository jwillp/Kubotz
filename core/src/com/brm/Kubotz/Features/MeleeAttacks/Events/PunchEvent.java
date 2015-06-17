package com.brm.Kubotz.Features.MeleeAttacks.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity punches something
 */
public class PunchEvent extends EntityEvent {
    /**
     *
     * @param entityId the entity punching
     */
    public PunchEvent(String entityId) {
        super(entityId);
    }
}
