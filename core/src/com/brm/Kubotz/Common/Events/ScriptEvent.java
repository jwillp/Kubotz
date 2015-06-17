package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * A Simple Test Event to be sent by Scripts
 */
public class ScriptEvent extends EntityEvent {

    public ScriptEvent(String entityId) {
        super(entityId);

        System.out.println("SCRIPT EEEEVEEENNNT!!");

    }
}
