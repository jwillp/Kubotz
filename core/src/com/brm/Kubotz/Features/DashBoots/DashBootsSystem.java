package com.brm.Kubotz.Features.DashBoots;

import com.brm.GoatEngine.ECS.common.JumpComponent;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Input.GameButton;

/**
 * System handling DashBoots Logic
 */
public class DashBootsSystem extends EntitySystem {



    public DashBootsSystem(){}

    @Override
    public void init(){}


    @Override
    public void handleInput(){
        for(Entity entity: getEntityManager().getEntitiesWithComponent(DashBootsComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            DashBootsComponent boots = (DashBootsComponent) entity.getComponent(DashBootsComponent.ID);

            if(gamePad.isButtonPressed(GameButton.BUTTON_X)){
                gamePad.releaseButton(GameButton.BUTTON_X);

                boolean up, down, left, right;
                up = gamePad.isButtonPressed(GameButton.DPAD_UP);
                down = gamePad.isButtonPressed(GameButton.DPAD_DOWN);
                left = gamePad.isButtonPressed(GameButton.DPAD_LEFT);
                right = gamePad.isButtonPressed(GameButton.DPAD_RIGHT);
                if(up || down || left || right) {
                    //Can we Dash?
                    if(!entity.hasComponent(DashComponent.ID)) {
                        if (boots.getCooldown().isDone())
                            turnDashOn(entity);
                    }
                }
            }
        }
    }

    /**
     * Turns the dash ability on for an entity
     * @param entity
     */
    private void turnDashOn(Entity entity) {
        //Remove Running Component + Jumping Component //TODO maybe disabling would be more suited
        //entity.disableComponent(RunningComponent.ID);
        entity.disableComponent(JumpComponent.ID);

        // Give a Dash Component to the entity
        entity.addComponent(new DashComponent(), DashComponent.ID);



    }




    @Override
    public void update(float dt) {

        //Check if we need to put any Dashing entity in recovery mode
        for(Entity entity: getEntityManager().getEntitiesWithComponent(DashBootsComponent.ID)){
            DashBootsComponent boots = (DashBootsComponent)entity.getComponent(DashBootsComponent.ID);

            if(entity.hasComponent(DashComponent.ID)){
                DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
                PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

                // Do we need to put the entity in RECOVERY MODE?
                // Is the entity done decelerating (last phase of dash)
                if(dashComp.getPhase() == DashComponent.Phase.DONE){
                        phys.getBody().setGravityScale(1);
                        boots.setInRecovery(true);
                }

                if(dashComp.getPhase() == DashComponent.Phase.PREPARATION){
                    entity.disableComponent(VirtualGamePad.ID);
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
        DashBootsComponent boots = (DashBootsComponent)entity.getComponent(DashBootsComponent.ID);
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        entity.enableComponent(VirtualGamePad.ID);


        // The dash is Done we can remove it
        entity.removeComponent(DashComponent.ID);

        //If the entity is not grounded ==> we cannot jump
        entity.getComponent(JumpComponent.ID).setEnabled(phys.isGrounded());

        //RECOVERY DONE?
        if(phys.isGrounded()){
            //entity.getComponent(JumpComponent.ID).setEnabled(true);
            boots.getCooldown().reset();
            boots.setInRecovery(false);
        }
    }













}
