package com.brm.Kubotz.Features.LaserSword;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity finishes swinging it's sword
 */
public class FinishSwordSwingEvent extends EntityEvent {


    public FinishSwordSwingEvent(String entityId) {
        super(entityId);
    }
}
