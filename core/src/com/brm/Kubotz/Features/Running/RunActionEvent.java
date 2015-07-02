package com.brm.Kubotz.Features.Running;

import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity wants to Move
 */
public class RunActionEvent extends EntityEvent {
    private final PhysicsComponent.Direction direction;

    public RunActionEvent(String entityId, PhysicsComponent.Direction direction) {
        super(entityId);
        this.direction = direction;
    }

    public PhysicsComponent.Direction getDirection(){
        return direction;
    }


}
