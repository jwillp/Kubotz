package com.brm.Kubotz.Events;

/**
 * Triggered when an entity is taking Damage
 */
public class TakeDamageEvent {

    private final String entityId;

    public TakeDamageEvent(String entityId){
        this.entityId = entityId;
    }

}
