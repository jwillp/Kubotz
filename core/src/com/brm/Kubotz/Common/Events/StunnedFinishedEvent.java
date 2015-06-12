package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * CWhen the stunned state of an entity comes to an end
 */
public class StunnedFinishedEvent extends Event{

    /**
     *
     * @param entityId the stunned entity
     */
    public StunnedFinishedEvent(String entityId) {
        super(entityId);
    }
}
