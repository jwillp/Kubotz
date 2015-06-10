package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;

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
        //Gauntlets
        this.getSystemManager().addSystem(DroneGauntletSystem.class, new DroneGauntletSystem());

        getSystemManager().addSystem(MagneticBootsSystem.class,  new MagneticBootsSystem());
        getSystemManager().addSystem(FlyingBootsSystem.class, new FlyingBootsSystem());
        getSystemManager().addSystem(DashBootsSystem.class, new DashBootsSystem());

    }


    /**
     * Handles the input for the skills
     */
    public void handleInput(){


        //Boots
        this.getSystemManager().getSystem(MagneticBootsSystem.class).handleInput();
        this.getSystemManager().getSystem(FlyingBootsSystem.class).handleInput();
        this.getSystemManager().getSystem(DashBootsSystem.class).handleInput();

        //Gauntlets
        this.getSystemManager().getSystem(DroneGauntletSystem.class).handleInput();

    }

    /**
     * Updates the input for the skills
     */
    public void update(float dt){

        //Boots
        this.getSystemManager().getSystem(MagneticBootsSystem.class).update(dt);
        this.getSystemManager().getSystem(FlyingBootsSystem.class).update(dt);
        this.getSystemManager().getSystem(DashBootsSystem.class).update(dt);

        //Gauntlets
        this.getSystemManager().getSystem(DroneGauntletSystem.class).update(dt);
    }


}
