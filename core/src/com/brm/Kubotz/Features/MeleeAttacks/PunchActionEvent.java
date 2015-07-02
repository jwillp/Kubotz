package com.brm.Kubotz.Features.MeleeAttacks;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity wants to punch
 */
public class PunchActionEvent extends EntityEvent{

    public PunchActionEvent(String entityId) {
        super(entityId);
    }
}
