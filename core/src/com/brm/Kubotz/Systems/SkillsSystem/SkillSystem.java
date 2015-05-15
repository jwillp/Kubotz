package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.Parts.DashBootsComponent;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillSystem extends EntitySystem {

    MagneticBootsSystem magneticBootsSystem;
    FlyingBootsSystem flyingBootsSystem;
    DashBootsSystem dashBootsSystem;

    public SkillSystem(EntityManager em) {
        super(em);

        magneticBootsSystem = new MagneticBootsSystem(em);
        flyingBootsSystem = new FlyingBootsSystem(em);
        dashBootsSystem = new DashBootsSystem(em);

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
    public void update(){
        magneticBootsSystem.update(0); //TODO Change that
        flyingBootsSystem.update(0);
        dashBootsSystem.update(0);
    }


}
