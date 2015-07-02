package com.brm.Kubotz.Features.Running;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * When an entity wants to fall
 */
public class FallActionEvent extends EntityEvent {

    public FallActionEvent(String entityId) {
        super(entityId);
    }
}
