package com.brm.Kubotz.Common.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.Kubotz.Features.DashBoots.Systems.DashBootsSystem;
import com.brm.Kubotz.Features.DroneGauntlet.Systems.DroneGauntletSystem;
import com.brm.Kubotz.Features.FlyBoots.Systems.FlyingBootsSystem;
import com.brm.Kubotz.Features.MagneticBoots.Systems.MagneticBootsSystem;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillsSystem extends EntitySystem {

    public SkillsSystem(){}

    @Override
    public void init(){

        getSystemManager().addSystem(MagneticBootsSystem.class,  new MagneticBootsSystem());
        getSystemManager().addSystem(FlyingBootsSystem.class,  new FlyingBootsSystem());
        getSystemManager().addSystem(DashBootsSystem.class, new DashBootsSystem());

        getSystemManager().addSystem(DroneGauntletSystem.class, new DroneGauntletSystem());
    }


    /**
     * Handles the input for the skills
     */
    public void handleInput(){
        getSystemManager().getSystem(MagneticBootsSystem.class).handleInput();
        getSystemManager().getSystem(FlyingBootsSystem.class).handleInput();
        getSystemManager().getSystem(DashBootsSystem.class).handleInput();

        getSystemManager().getSystem(DroneGauntletSystem.class).handleInput();
    }

    /**
     * Updates the input for the skills
     */
    public void update(float dt){
        getSystemManager().getSystem(MagneticBootsSystem.class).update(dt);
        getSystemManager().getSystem(FlyingBootsSystem.class).update(dt);
        getSystemManager().getSystem(DashBootsSystem.class).update(dt);

        getSystemManager().getSystem(DroneGauntletSystem.class).update(dt);
    }


}
