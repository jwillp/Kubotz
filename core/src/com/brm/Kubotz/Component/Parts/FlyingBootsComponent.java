package com.brm.Kubotz.Component.Parts;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Boots giving a Kubotz the ability to Fly
 */
public class FlyingBootsComponent extends Component{
    public static String ID = "FLY_BOOTS_COMPONENT";


    private Timer effectDuration = new Timer(Timer.FIVE_SECONDS);


    public Timer getEffectDuration() {
        return effectDuration;
    }
}
