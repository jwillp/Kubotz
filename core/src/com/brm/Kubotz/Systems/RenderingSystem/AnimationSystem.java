package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.AnimationComponent;
import com.brm.Kubotz.Component.SpriteComponent;
import com.brm.Kubotz.Components.Movements.DashComponent;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {


    AnimationSheet idle = new AnimationSheet("textures/idle.png", 1/15f);
    AnimationSheet running = new AnimationSheet("textures/running.png", 1/15f);
    AnimationSheet jumping = new AnimationSheet("textures/jumping.png", 1/15f);
    AnimationSheet falling = new AnimationSheet("textures/falling.png", 1/15f);
    AnimationSheet kicking = new AnimationSheet("textures/kicking.png", 1/15f);
    AnimationSheet dashing = new AnimationSheet("textures/dashing.png", 1/74f);
    AnimationSheet dashingPrep = new AnimationSheet("textures/dashing_prep.png", 1/30f);




    public AnimationSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init() {

    }


    @Override
    public void update(float dt){

        for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){

            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            AnimationComponent animComp = (AnimationComponent)entity.getComponent(AnimationComponent.ID);





            //Update the sprite according to the current animation frame


            //IDLE
            if(phys.getVelocity().isZero()){
                animComp.setCurrentAnimation(idle.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
            }

            //RUNNING
            if(phys.getVelocity().x != 0 && phys.isGrounded()){
                animComp.setCurrentAnimation(running.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
            }

            //JUMPING TODO Opposite of gravity scale
            if(phys.getVelocity().y > 0){
                animComp.setCurrentAnimation(jumping.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.NORMAL);
            }

            //FALLING TODO same gravity scale
            if(phys.getVelocity().y < 0){
                animComp.setCurrentAnimation(falling.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
            }

            //LANDING
            if(phys.getVelocity().y < 0 && phys.isGrounded()){
                Logger.log("LANDING");
            }



            //DASH ANIM
            if(entity.hasComponent(DashComponent.ID)){
                DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);

                if(dashComp.getPhase() == DashComponent.Phase.PREPARATION){
                    animComp.setCurrentAnimation(dashingPrep.generateAnimation());
                    animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
                }

                if(dashComp.getPhase() == DashComponent.Phase.TRAVEL){
                    animComp.setCurrentAnimation(dashing.generateAnimation());
                    animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
                }
            }



            //Set the sprite for the current animation frame
            animComp.stateTime += Gdx.graphics.getDeltaTime();
            spriteComp.currentSprite = new TextureRegion(animComp.getCurrentAnimation().getKeyFrame(animComp.stateTime, true));
            //Flip image according to direction
            if (phys.getDirection() == PhysicsComponent.Direction.RIGHT || spriteComp.currentSprite.isFlipX()) {
                spriteComp.currentSprite.flip(true, false);
            }





        }
    }









}
