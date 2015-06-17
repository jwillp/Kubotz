package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * CWhen the stunned state of an entity comes to an end
 */
public class StunnedFinishedEvent extends EntityEvent {

    /**
     *
     * @param entityId the stunned entity
     */
    public StunnedFinishedEvent(String entityId) {
        super(entityId);
    }
}
