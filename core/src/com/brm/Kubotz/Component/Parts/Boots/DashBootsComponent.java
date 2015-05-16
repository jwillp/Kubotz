package com.brm.Kubotz.Component.Parts.Boots;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Movements.DashComponent;

/**
 * Boots giving a Kubotz the ability to Dash
 */
public class DashBootsComponent extends Component{

    public static final String ID = "DASH_BOOTS_COMPONENT";

    private Timer cooldown = new Timer(200);       //The cool down between the uses of the boots
    private boolean isInRecovery;  // If the boots are in recovery mode


    public DashBootsComponent(){
        cooldown.start();
    }


    public Timer getCooldown() {
        return cooldown;
    }

    public boolean isInRecovery() {
        return isInRecovery;
    }

    public void setInRecovery(boolean isInRecovery) {
        this.isInRecovery = isInRecovery;
    }
}
