package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillsSystem extends EntitySystem {

    public SkillsSystem(EntityManager em) {
        super(em);



    }

    @Override
    public void init(){
        //Boots
        this.getSystemManager().addSystem(MagneticBootsSystem.class, new MagneticBootsSystem(em));
        this.getSystemManager().addSystem(FlyingBootsSystem.class, new FlyingBootsSystem(em));
        this.getSystemManager().addSystem(DashBootsSystem.class, new DashBootsSystem(em));


        //Gauntlets
        this.getSystemManager().addSystem(DroneGauntletSystem.class, new DroneGauntletSystem(em));
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
