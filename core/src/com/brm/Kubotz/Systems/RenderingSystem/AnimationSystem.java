package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.AnimationComponent;
import com.brm.Kubotz.Component.Skills.DashComponent;
import com.brm.Kubotz.Component.SpriteComponent;

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


    public void update(){

        for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){

            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            AnimationComponent animComp = (AnimationComponent)entity.getComponent(AnimationComponent.ID);





            //Update the sprite according to the current animation frame


            //IDLE
            if(phys.getVelocity().isZero()){
                animComp.animation = idle.generateAnimation();
                animComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }

            //RUNNING
            if(phys.getVelocity().x != 0 && phys.isGrounded()){
                animComp.animation = running.generateAnimation();
                animComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }

            //JUMPING TODO Opposite of gravity scale
            if(phys.getVelocity().y > 0){
                animComp.animation = jumping.generateAnimation();
                animComp.animation.setPlayMode(Animation.PlayMode.NORMAL);
            }

            //FALLING TODO same gravity scale
            if(phys.getVelocity().y < 0){
                animComp.animation = falling.generateAnimation();
                animComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }

            //LANDING
            if(phys.getVelocity().y < 0 && phys.isGrounded()){
                Logger.log("LANDING");
            }



            //DASH ANIM
            if(entity.hasComponent(DashComponent.ID)){
                DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);

                if(dashComp.phase == DashComponent.Phase.PREPARATION){
                    animComp.animation = dashingPrep.generateAnimation();
                    animComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

                if(dashComp.phase == DashComponent.Phase.MOVEMENT){
                    animComp.animation = dashing.generateAnimation();
                    animComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }
            }



            //Set the sprite for the current animation frame
            animComp.stateTime += Gdx.graphics.getDeltaTime();
            spriteComp.currentSprite = new TextureRegion(animComp.animation.getKeyFrame(animComp.stateTime, true));

            //Flip image according to direction
            if (phys.direction == PhysicsComponent.Direction.RIGHT || spriteComp.currentSprite.isFlipX()) {
                spriteComp.currentSprite.flip(true, false);
            }






        }
    }









}
