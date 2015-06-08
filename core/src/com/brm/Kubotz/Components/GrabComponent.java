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
    private Timer durationTimer = new Timer(Constants.PUNCH_DURATION);
    private Timer cooldown = new Timer(Config.PUNCH_COOLDOWN);  //The delay between uses of grab

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
