package com.brm.GoatEngine.ECS;

import java.util.ArrayList;

/**
 * Manages entity Events
 *
 * //TODO Make systems register themselves to EventTypes
 */
public class EventManager{
    private ECSManager ecsManager;

    ArrayList<Event> events;

    public EventManager(ECSManager manager) {
        this.ecsManager = manager;
    }

}
