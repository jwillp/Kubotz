package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.Systems.MovementSystems.DashSystem;
import com.brm.Kubotz.Systems.MovementSystems.FlySystem;
import com.brm.Kubotz.Systems.MovementSystems.RunningSystem;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillsSystem extends EntitySystem {

    MagneticBootsSystem magneticBootsSystem;
    FlyingBootsSystem flyingBootsSystem;
    DashBootsSystem dashBootsSystem;

    public SkillsSystem() {



    }

    @Override
    public void init(){
        magneticBootsSystem = new MagneticBootsSystem();
        flyingBootsSystem = new FlyingBootsSystem();
        dashBootsSystem = new DashBootsSystem();

        getSystemManager().addSystem(MagneticBootsSystem.class, magneticBootsSystem);
        getSystemManager().addSystem(FlyingBootsSystem.class, flyingBootsSystem);
        getSystemManager().addSystem(DashBootsSystem.class, dashBootsSystem);
    }


    /**
     * Handles the input for the skills
     */
    public void handleInput(){

        flyingBootsSystem.handleInput();
        magneticBootsSystem.handleInput();
        dashBootsSystem.handleInput();


    }

    /**
     * Updates the input for the skills
     */
    public void update(float dt){
        magneticBootsSystem.update(0); //TODO Change that
        flyingBootsSystem.update(0);
        dashBootsSystem.update(0);
    }


}
