package com.brm.GoatEngine.EventManager;

/**
 * Entity Events used by Entity systems for intercommunication
 */
public abstract class EntityEvent extends GameEvent{

    private final String entityId;  //The entity to which the event mostly applies (can be null for some special events)


    protected EntityEvent(String entityId){
        this.entityId = entityId;
    }


    public String getEntityId() {
        return entityId;
    }




}
