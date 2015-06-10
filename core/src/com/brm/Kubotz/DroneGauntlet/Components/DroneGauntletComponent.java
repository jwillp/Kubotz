package com.brm.Kubotz.DroneGauntlet.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

import java.util.ArrayList;



/**
 * A Gauntlet spawning DRONES
 */
public class DroneGauntletComponent extends EntityComponent {
    public final static String ID = "DRONE_GAUNTLET_COMPONENT";

    private Timer cooldown = new Timer(Timer.FIVE_SECONDS);

    private ArrayList<String> drones = new ArrayList<String>();

    public DroneGauntletComponent(){
        cooldown.start();
    }


    public Timer getCooldown() {
        return cooldown;
    }

    public void addDrone(String droneId) {
        drones.add(droneId);
    }

    public void removeDrone(String droneId){
        drones.remove(droneId);
    }


    public ArrayList<String> getDrones(){
        return drones;
    }
}