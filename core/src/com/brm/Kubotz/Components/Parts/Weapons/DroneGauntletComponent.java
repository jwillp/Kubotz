package com.brm.Kubotz.Components.Parts.Weapons;

import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * A Gauntlet spawning DRONES
 */
public class DroneGauntletComponent extends EntityComponent {
    public final static String ID = "DRONE_GAUNTLET_COMPONENT";


    private Timer cooldown = new Timer(1);




    public Timer getCooldown() {
        return cooldown;
    }
}
