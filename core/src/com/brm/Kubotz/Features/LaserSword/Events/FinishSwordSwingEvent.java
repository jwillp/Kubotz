package com.brm.Kubotz.Features.LaserSword.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity finishes swinging it's sword
 */
public class FinishSwordSwingEvent extends Event{


    public FinishSwordSwingEvent(String entityId) {
        super(entityId);
    }
}
