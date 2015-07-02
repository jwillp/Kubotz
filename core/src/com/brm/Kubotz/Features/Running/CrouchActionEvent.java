package com.brm.Kubotz.Features.Running;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * When an entity wants to crouch
 */
public class CrouchActionEvent extends EntityEvent{

    public CrouchActionEvent(String entityId) {
        super(entityId);
    }
}
