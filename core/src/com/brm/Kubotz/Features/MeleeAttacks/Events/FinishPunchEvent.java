package com.brm.Kubotz.Features.MeleeAttacks.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered wjhen an entity finishes Punching
 */
public class FinishPunchEvent extends Event {

    public FinishPunchEvent(String entityId) {
        super(entityId);
    }
}
