package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.Charac.ActionStateComponent;
import com.brm.Kubotz.Component.Charac.MovementStatesComponent;
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
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);
            MovementStatesComponent movSt = (MovementStatesComponent)entity.getComponent(MovementStatesComponent.ID);
            ActionStateComponent actSt = (ActionStateComponent)entity.getComponent(ActionStateComponent.ID);
            //Change Animation according to State



            //Update the sprite according to the current animation frame

            if(spriteComp.animation == null){
                spriteComp.animation = idle.generateAnimation();
                spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }


            if(movSt.state == MovementStatesComponent.State.RUNNING_LEFT || movSt.state == MovementStatesComponent.State.RUNNING_RIGHT){
                spriteComp.animation = running.generateAnimation();
            }
            if(movSt.state == MovementStatesComponent.State.JUMPING){
                spriteComp.animation = jumping.generateAnimation();
            }

            /*if(!phys.isGrounded()){
                if(phys.getVelocity().y > 0){
                    spriteComp.animation = jumping.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.NORMAL);
                }else{
                    spriteComp.animation = falling.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

            }else{
                if(phys.getVelocity().x != 0){
                    float duration = running.duration; /* 1/Math.abs(phys.getVelocity().x);
                    Logger.log(duration);
                    spriteComp.animation = new Animation(duration, running.frames);

                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }else{
                    spriteComp.animation = idle.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

            }*/


            if(entity.hasComponent(DashComponent.ID)){
                DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);

                if(dashComp.phase == DashComponent.Phase.PREPARATION){
                    spriteComp.animation = dashingPrep.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

                if(dashComp.phase == DashComponent.Phase.MOVEMENT){
                    spriteComp.animation = dashing.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }
            }






            spriteComp.stateTime += Gdx.graphics.getDeltaTime();
            spriteComp.currentFrame = new TextureRegion(spriteComp.animation.getKeyFrame(spriteComp.stateTime, true));

            //Flip image according to direction
            if (phys.direction == PhysicsComponent.Direction.RIGHT || spriteComp.currentFrame.isFlipX()) {
                spriteComp.currentFrame.flip(true, false);
            }






        }
    }









}
