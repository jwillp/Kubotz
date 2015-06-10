package com.brm.Kubotz.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;

/**
 * Makes an entity able to grab/pick up objects and throw them away.
 * Entities with this component can pickup other entities with a Grabbable entities
 */
public class GrabComponent extends EntityComponent {
    public  final static String ID = "GRAB_COMPONENT";
    private Timer durationTimer = new Timer(200);
    private Timer cooldown = new Timer(100);  //The delay between uses of grab
    private boolean grabbing;

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

    public void setGrabbing(boolean grabbing) {
        this.grabbing = grabbing;
    }

    public boolean isGrabbing() {
        return grabbing;
    }
}
