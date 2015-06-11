package com.brm.Kubotz.Features.DashBoots.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;

/**
 * Boots giving a Kubotz the ability to Dash
 */
public class DashBootsComponent extends EntityComponent {

    public static final String ID = "DASH_BOOTS_COMPONENT";

    private Timer cooldown = new Timer(Config.DASHBOOTS_COOLDOWN); //The cool down between the uses of the boots
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
