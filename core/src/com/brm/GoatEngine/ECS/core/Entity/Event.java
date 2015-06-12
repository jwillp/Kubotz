package com.brm.GoatEngine.ECS.core.Entity;

/**
 * Entity Events used by systems for intercommunication
 */
public abstract class Event {

    private final String entityId;  //The entity to which the event mostly applies (can be null for some special events)


    protected Event(String entityId){
        this.entityId = entityId;
    }


    public String getEntityId() {
        return entityId;
    }



    public <T extends Event> boolean isOfType(Class<T> type){
        return this.getClass() == type;
    }


}
