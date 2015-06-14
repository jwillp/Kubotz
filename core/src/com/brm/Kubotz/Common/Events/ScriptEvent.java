package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * A SImple Test Event to be sent by Scripts
 */
public class ScriptEvent extends Event {

    public ScriptEvent(String entityId) {
        super(entityId);

        System.out.println("SCRIPT EEEEVEEENNNT!!");

    }
}
