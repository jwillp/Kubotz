package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.ParticleEffect;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Components.Movements.DashComponent;
import com.brm.Kubotz.Components.Movements.FlyComponent;
import com.brm.Kubotz.Components.Movements.RunningComponent;
import com.brm.Kubotz.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Components.Parts.Weapons.GunComponent;
import com.brm.Kubotz.Components.Parts.Weapons.LaserSwordComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

/**
 * Updates a kubotz Sprite according to animation and movement
 * It is an animation Controller
 */
public class KubotzAnimationScript extends EntityScript {

    public static final  String IDLE = "Idle";
    public static final  String RUNNING = "Running";
    public static final  String JUMPING = "Jumping";
    public static final  String FALLING = "Falling";


    //Default state
    private String currentState = "Idle";

    @Override
    public void onCollision(EntityContact contact) {

        Entity entity = contact.getEntityA();

        //GETTING HIT

    }

    @Override
    public void onUpdate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);
        HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);



        handleRunning(entity, phys, gamePad, anim);


        anim.setAnimation(currentState);
        handleFlip(phys, anim);

    }




    /**
     * Flips the Sprite to the side the character is looking at
     * @param phys
     * @param anim
     */
    private void handleFlip(PhysicsComponent phys, SpriterAnimationComponent anim){
        //Handle Flip
        if(phys.getDirection() == PhysicsComponent.Direction.RIGHT){
            if(!anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }else{
            if(anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }
    }






    private void handleRunning(Entity entity, PhysicsComponent phys, VirtualGamePad gamePad, SpriterAnimationComponent anim){
        //Check states
        if(currentState.equals(IDLE)){
            if(gamePad.isButtonPressed(GameButton.MOVE_LEFT) || gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) {
                currentState = "Running";
            }

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                    currentState = JUMPING;
                }
            }

            if(!phys.isGrounded()){
                currentState = FALLING;
            }

        }else if(currentState.equals(RUNNING)){
            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                    currentState = JUMPING;
                }
            }
            if(!phys.isGrounded()){
                currentState = FALLING;
            }

            if(phys.getVelocity().x == 0 && phys.isGrounded()){
                currentState = IDLE;
            }

            if(phys.isGrounded())
            // Facing opposite of direction
            {
                if (phys.getDirection() == PhysicsComponent.Direction.RIGHT && phys.getVelocity().x < 0
                        || phys.getDirection() == PhysicsComponent.Direction.LEFT && phys.getVelocity().x > 0) {
                    createMotionDust(entity, phys);
                }
            }


        }else if(currentState.equals(JUMPING)){
            if(phys.getVelocity().y < 0){
                currentState = FALLING;
            }

        }else if(currentState.equals(FALLING)){

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                    currentState = JUMPING;
                }
            }else if(phys.getVelocity().x != 0 && phys.isGrounded()){
                currentState = RUNNING;
                createMotionDust(entity, phys);
            }else if(phys.isGrounded()){
                currentState = IDLE;
                createMotionDust(entity, phys);
            }
        }
    }


    /**
     * Creates motion dust for a certain entity
     */
    private void createMotionDust(Entity entity, PhysicsComponent phys){

        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pos.y -= phys.getHeight();
        pef.addEffect(Gdx.files.internal("particles/landingDust.pe"), pos);
    }



}
