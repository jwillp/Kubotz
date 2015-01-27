package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;

/**
 * Used to process Skills... most active skills
 * It is a global system using sub systems (each skills system)
 */
public class SkillSystem extends EntitySystem {

    MagneticFeetSystem magneticFeetSystem;

    public SkillSystem(EntityManager em) {
        super(em);

        magneticFeetSystem = new MagneticFeetSystem(em);





    }


    /**
     * Handles the input for the skills
     */
    public void handleInput(){

        magneticFeetSystem.handleInput();
        


    }

    /**
     * Updates the input for the skills
     */
    public void update(){
        magneticFeetSystem.update(0); //TODO Change that
    }


}
