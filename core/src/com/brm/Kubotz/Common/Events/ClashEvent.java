package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * A Clash between two attacks
 */
public class ClashEvent extends EntityEvent {


    private String entityB;

    /**
     * The two entities clashing
     * @param entityId
     */
    public ClashEvent(String entityId, String entityB) {
        super(entityId);
        this.entityB = entityB;
    }
}
