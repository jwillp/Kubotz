package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillsSystem extends EntitySystem {

    MagneticBootsSystem magneticBootsSystem;
    FlyingBootsSystem flyingBootsSystem;
    DashBootsSystem dashBootsSystem;

    public SkillsSystem(EntityManager em) {
        super(em);

        // TODO Pull SystemManager
        magneticBootsSystem = new MagneticBootsSystem(em);
        flyingBootsSystem = new FlyingBootsSystem(em);
        dashBootsSystem = new DashBootsSystem(em);

    }

    @Override
    public void init(){}


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
