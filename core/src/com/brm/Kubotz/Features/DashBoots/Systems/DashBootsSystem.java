package com.brm.Kubotz.Features.DashBoots.Systems;

import com.brm.GoatEngine.ECS.utils.Components.JumpComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Features.DashBoots.Components.DashComponent;
import com.brm.Kubotz.Features.DashBoots.Components.DashBootsComponent;
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
                        Logger.log(boots.getCooldown().isDone() + " " + boots.getCooldown().getDelay());
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
        Logger.log("DASH ON");
        //Remove Running Component + Jumping Component //TODO maybe disabling would be more suited
        //entity.removeComponent(RunningComponent.ID);
        entity.getComponent(JumpComponent.ID).setEnabled(false);

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


                Logger.log(dashComp.getPhase());
                // DO we need to put the entity in RECOVERY MODE?
                // Is the entity done decelerating (last phase of dash)
                if(dashComp.getPhase() == DashComponent.Phase.DONE){
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
        DashBootsComponent boots = (DashBootsComponent)entity.getComponent(DashBootsComponent.ID);
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);


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
