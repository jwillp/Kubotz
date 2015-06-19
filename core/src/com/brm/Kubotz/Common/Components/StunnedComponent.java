package com.brm.Kubotz.Common.Components;

import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Used when an entity is stunned for a few seconds
 * It means that it can't be attack but it cannot move either
 */
public class StunnedComponent extends EntityComponent {
    public final static String ID = "STUNNED_COMPONENT";
    private Timer duration = new Timer(100);

    public StunnedComponent(){
        duration.start();
    }


    public Timer getDuration() {
        return duration;
    }


}
