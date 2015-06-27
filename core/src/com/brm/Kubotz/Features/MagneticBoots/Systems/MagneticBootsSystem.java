package com.brm.Kubotz.Features.MagneticBoots.Systems;

import com.badlogic.gdx.math.MathUtils;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Features.MagneticBoots.Components.MagneticBootsComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * MagneticBoot
 */
public class MagneticBootsSystem extends EntitySystem{


    public MagneticBootsSystem(){}

    @Override
    public void init() {}

    /**
     * Handles the input for every entity with magnetic boots
     */
    public void handleInput() {
        for (Entity entity : getEntityManager().getEntitiesWithComponent(MagneticBootsComponent.ID)) {
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

        if(gamePad.isButtonPressed(GameButton.BUTTON_X)){

            if(boots.isEnabled()){
                processMagno(entity, false);
            }else{
                processMagno(entity, true);
            }
            //Simulate a small jump
            gamePad.pressButton(GameButton.DPAD_UP);
        }
    }





    public void update(float deltaTime){}


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
        mag.setStartingAngle(phys.getBody().getAngle()*MathUtils.radDeg);
        Logger.debug("START ANGLE" + mag.getStartingAngle());
        Logger.debug("Entity" + entity.getID() + " ==> MAGNO MODE " + mag.isEnabled());
        //mag.getRotationTimer().reset();


        float newAngle = (phys.getBody().getAngle() == 0) ? 180: 0;
        phys.getBody().setTransform(phys.getPosition(), newAngle * MathUtils.degRad); // Rotate

    }




}
