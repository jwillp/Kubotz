package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Skills.FlyComponent;
import com.brm.Kubotz.Component.Skills.MagneticFeetComponent;
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
            MagneticFeetComponent magneticComponent = (MagneticFeetComponent) entity.getComponent(MagneticFeetComponent.ID);
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

            if (gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)) {
                MagneticFeetComponent mag = (MagneticFeetComponent) entity.getComponent(MagneticFeetComponent.ID);
                setEnabled(entity, !mag.isEnabled());
            }
        }
    }

    /**
     * Called when the user requires to activate or deactivate the skill
     */
    public void setEnabled(Entity entity, boolean isActivated){
        MagneticFeetComponent mag = (MagneticFeetComponent) entity.getComponent(MagneticFeetComponent.ID);
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        mag.setEnabled(isActivated);
        phys.getBody().setGravityScale(phys.getBody().getGravityScale() * -1); //Invert gravity
        //phys.getBody().setA
    }



    /**
     * See if the entity can still use that skill
     */
    public void update(Entity entity){
        //TODO implement if necessary Cooldown and effect timer
    }



}
