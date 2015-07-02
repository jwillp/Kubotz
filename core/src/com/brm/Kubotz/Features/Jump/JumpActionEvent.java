package com.brm.Kubotz.Features.Jump;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * When an entity requests to jump
 */
public class JumpActionEvent extends EntityEvent{

    /**
     *
     * @param entityId the jumper id
     */
    public JumpActionEvent(String entityId) {
        super(entityId);
    }


}
