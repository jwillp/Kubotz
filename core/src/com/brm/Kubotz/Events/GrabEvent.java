package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity tries to Grab Something
 */
public class GrabEvent extends Event{


    public GrabEvent(String grabberId){
        super(grabberId);
    }

    /**
     * The entity trying to grab
     * @return
     */
    @Override
    public String getEntityId() {
        return super.getEntityId();
    }
}
