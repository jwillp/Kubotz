package com.brm.Kubotz.Features.Grab.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity is grabbed
 */
public class GrabbedEvent extends Event {
    /**
     *
     * @param entityId The grabbed entity
     */
    public GrabbedEvent(String entityId) {
        super(entityId);
    }
}
