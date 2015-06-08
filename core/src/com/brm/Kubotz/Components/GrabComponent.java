package com.brm.Kubotz.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Makes an entity able to grab/pick up objects and throw them away.
 * Entities with this component can pickup other entities with a Grabbable entities
 */
public class GrabComponent extends EntityComponent {
    public  final static String ID = "GRAB_COMPONENT";
    private Timer durationTimer = new Timer(500);
    private Timer cooldown = new Timer(30);

    public GrabComponent(){
        durationTimer.start();
        cooldown.start();
    }

    public Timer getDurationTimer() {
        return durationTimer;
    }

    public Timer getCooldown() {
        return cooldown;
    }

}
