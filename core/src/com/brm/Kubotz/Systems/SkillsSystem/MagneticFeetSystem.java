package com.brm.Kubotz.Systems.SkillsSystem;

import com.badlogic.gdx.math.MathUtils;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Skills.Active.MagneticFeetComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * MagneticBoot
 */
public class MagneticFeetSystem extends EntitySystem{


    public MagneticFeetSystem(EntityManager em) {
        super(em);
    }

    /**
     * Handles the input for every magnetic feet entities
     */
    public void handleInput() {
        for (Entity entity : em.getEntitiesWithComponent(MagneticFeetComponent.ID)) {
            handleInput(entity);
        }
    }


    /**
     * Handles the input for a single entity
     * @param entity the entity to handle
     */
    public void handleInput(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        MagneticFeetComponent magnoFeet = (MagneticFeetComponent)entity.getComponent(MagneticFeetComponent.ID);

        if(gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){

            if(magnoFeet.isEnabled()){
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
        MagneticFeetComponent mag = (MagneticFeetComponent) entity.getComponent(MagneticFeetComponent.ID);
        mag.setEnabled(isEnabled);

        phys.getBody().setGravityScale(phys.getBody().getGravityScale() * -1); //Invert gravity
        mag.startingAngle = phys.getBody().getAngle()*MathUtils.radDeg;
        Logger.log("START ANGLE" + mag.startingAngle);
        Logger.log("Entity" + entity.getID() + " ==> MAGNO MODE " + mag.isEnabled());
        mag.getRotationTimer().reset();


        float newAngle = (phys.getBody().getAngle() == 0) ? 180: 0;
        phys.getBody().setTransform(phys.getPosition(), newAngle * MathUtils.degRad); // Rotate

    }




    /**
     * See if the entity can still use that skill
     */
    public void update(Entity entity){



    }


    public void update(float deltaTime){
        for(Entity entity: em.getEntitiesWithComponent(MagneticFeetComponent.ID)){
            update(entity);
        }
    }

}
