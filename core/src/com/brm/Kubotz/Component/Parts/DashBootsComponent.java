package com.brm.Kubotz.Component.Parts;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Boots giving a Kubotz the ability to Dash
 */
public class DashBootsComponent extends Component{

    public static final String ID = "DASH_BOOTS_COMPONENT";
    private Timer cooldown;       //The cool down between the uses of the boots
    private Timer effectDuration; //The duration of the boot's effect


    private boolean isInRecovery;  // If the boots are in recovery mode


    public Timer getCooldown() {
        return cooldown;
    }

    public Timer getEffectDuration() {
        return effectDuration;
    }

    public boolean isInRecovery() {
        return isInRecovery;
    }

    public void setInRecovery(boolean isInRecovery) {
        this.isInRecovery = isInRecovery;
    }
}
