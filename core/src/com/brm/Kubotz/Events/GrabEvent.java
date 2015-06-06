package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.Event;

/**
 * Triggered when an entity tries to Grab Something
 */
public class GrabEvent extends Event{

    private final String grabberId; //The entity trying to grab

    public GrabEvent(String grabberId){
        this.grabberId = grabberId;
    }

}
