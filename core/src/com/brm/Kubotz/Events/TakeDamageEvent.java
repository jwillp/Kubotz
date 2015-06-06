package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity is taking Damage
 */
public class TakeDamageEvent extends Event {

    public TakeDamageEvent(String entityId){
        super(entityId);
    }

}
