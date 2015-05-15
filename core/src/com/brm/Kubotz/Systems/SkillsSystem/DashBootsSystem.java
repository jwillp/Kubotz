package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.Movements.DashComponent;
import com.brm.Kubotz.Component.Movements.FlyComponent;
import com.brm.Kubotz.Component.Parts.DashBootsComponent;
import com.brm.Kubotz.Component.Parts.FlyingBootsComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * System handling DashBoots Logic
 */
public class DashBootsSystem extends EntitySystem {



    public DashBootsSystem(EntityManager em) {
        super(em);
    }



    @Override
    public void handleInput(){
        for(Entity entity: em.getEntitiesWithComponent(DashBootsComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            DashBootsComponent boots = (DashBootsComponent) entity.getComponent(DashBootsComponent.ID);

            if(gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){
                //Can we Dash?
                if(!entity.hasComponent(DashBootsComponent.ID)) {
                    if (boots.getCooldown().isDone())
                        turnDashOn(entity);
                }
            }
        }
    }

    /**
     * Turns the dash ability on for an entity
     * @param entity
     */
    private void turnDashOn(Entity entity) {

    }


    @Override
    public void update(float dt) {

        //Check if we need to put any Dashing entity in recovery mode
        for(Entity entity: em.getEntitiesWithComponent(DashBootsComponent.ID)){
            DashBootsComponent boots = (DashBootsComponent)entity.getComponent(DashBootsComponent.ID);
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

            // DO we need to put the entity in RECOVERY MODE?
            // Is the entity done decelerating (last phase of dash)
            if(dashComp.phase == DashComponent.Phase.DECELERATION){
                if(phys.getVelocity().x == 0){
                    phys.getBody().setGravityScale(1);
                    boots.setInRecovery(true);
                }
            }

            if(boots.isInRecovery()){
                updateRecoveryPhase(entity);
            }

        }

    }



    /**
     * Updates an entity when it is in RECOVERY phase
     * @param entity
     */
    private void updateRecoveryPhase(Entity entity){
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        JumpComponent jumpComponent = (JumpComponent) entity.getComponent(JumpComponent.ID);
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        //If the entity is not grounded ==> we cannot jump
        jumpComponent.setEnabled(phys.isGrounded());

        if(phys.isGrounded()){
            jumpComponent.setEnabled(true);
            dashComp.setEnabled(false);
            dashComp.direction.set(0,0);
        }
    }













}
