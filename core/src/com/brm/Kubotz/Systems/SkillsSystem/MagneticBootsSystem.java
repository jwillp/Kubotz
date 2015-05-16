package com.brm.Kubotz.Systems.SkillsSystem;

import com.badlogic.gdx.math.MathUtils;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Movements.FlyComponent;
import com.brm.Kubotz.Component.Parts.MagneticBootsComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * MagneticBoot
 */
public class MagneticBootsSystem extends EntitySystem{


    public MagneticBootsSystem(EntityManager em) {
        super(em);
    }

    /**
     * Handles the input for every entity with magnetic boots
     */
    public void handleInput() {
        for (Entity entity : em.getEntitiesWithComponent(MagneticBootsComponent.ID)) {
            if(entity.hasComponent(VirtualGamePad.ID)){
                handleInputForEntity(entity);
            }
        }
    }


    /**
     * Handles the input for a single entity
     * @param entity the entity to handle
     */
    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        MagneticBootsComponent boots = (MagneticBootsComponent)entity.getComponent(MagneticBootsComponent.ID);

        if(gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){

            if(boots.isEnabled()){
                processMagno(entity, false);
            }else{
                processMagno(entity, true);
            }
            //Simulate a small jump
            gamePad.pressButton(GameButton.MOVE_UP);
        }
    }






    /**
     * processes An entity's magnetic feet
     * @param entity the entity to process
     * @param isEnabled, whether or not the magnetic feet are enabled
     */
    public void processMagno(Entity entity, boolean isEnabled){
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        MagneticBootsComponent mag = (MagneticBootsComponent) entity.getComponent(MagneticBootsComponent.ID);
        mag.setEnabled(isEnabled);

        phys.getBody().setGravityScale(phys.getBody().getGravityScale() * -1); //Invert gravity
        mag.startingAngle = phys.getBody().getAngle()*MathUtils.radDeg;
        Logger.log("START ANGLE" + mag.startingAngle);
        Logger.log("Entity" + entity.getID() + " ==> MAGNO MODE " + mag.isEnabled());
        //mag.getRotationTimer().reset();


        float newAngle = (phys.getBody().getAngle() == 0) ? 180: 0;
        phys.getBody().setTransform(phys.getPosition(), newAngle * MathUtils.degRad); // Rotate

    }




    /**
     * See if the entity can still use that skill
     */
    public void update(Entity entity){



    }


    public void update(float deltaTime){
        for(Entity entity: em.getEntitiesWithComponent(MagneticBootsComponent.ID)){
            update(entity);
        }
    }

}
