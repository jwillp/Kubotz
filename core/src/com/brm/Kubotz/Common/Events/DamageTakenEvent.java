package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Utils.Logger;

/**
 * Triggered when an entity has taken damage (not to be confused with TakeDamageEvent
 */
public class DamageTakenEvent extends Event{

    /**
     * The entity who took the damage
     * @param entityId
     */
    public DamageTakenEvent(String entityId) {
        super(entityId);
        Logger.log("DAMAGE TAKEN");
    }
}
