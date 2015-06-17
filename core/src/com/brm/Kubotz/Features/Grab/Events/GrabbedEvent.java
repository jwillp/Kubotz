package com.brm.Kubotz.Features.Grab.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity is grabbed
 */
public class GrabbedEvent extends EntityEvent {
    /**
     *
     * @param entityId The grabbed entity
     */
    public GrabbedEvent(String entityId) {
        super(entityId);
    }
}
