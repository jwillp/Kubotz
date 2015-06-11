package com.brm.Kubotz.Features.Grab.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Utils.Logger;

/**
 * Triggered when an entity tries to Grab Something
 */
public class GrabEvent extends Event{

    /**
     * @param grabberId the grabbing entity
     */
    public GrabEvent(String grabberId){
        super(grabberId);
        Logger.log("GRAB");

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
