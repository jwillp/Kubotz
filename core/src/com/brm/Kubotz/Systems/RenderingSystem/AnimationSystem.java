package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.SpriteComponent;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {


    AnimationSheet idle = new AnimationSheet("textures/idle.png", 1/15f);
    AnimationSheet running = new AnimationSheet("textures/running.png", 1/15f);
    AnimationSheet jumping = new AnimationSheet("textures/running.png", 1/15f);

    public AnimationSystem(EntityManager em) {
        super(em);
    }


    public void update(){

        for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);


            //Change Animation according to State



            //Update the sprite according to the current animation frame

            if(spriteComp.animation == null){

                spriteComp.animation = idle.generateAnimation();
                spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }





            if(!phys.isGrounded()){
                if(phys.getVelocity().y > 0){
                    spriteComp.animation = jumping.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.NORMAL);
                }

            }else{
                if(phys.getVelocity().x != 0){
                    spriteComp.animation = running.generateAnimation();
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

            }





            spriteComp.stateTime += Gdx.graphics.getDeltaTime();
            spriteComp.currentFrame = spriteComp.animation.getKeyFrame(spriteComp.stateTime, true);

            TextureRegion currentFrame = spriteComp.currentFrame;
            if(phys.direction == PhysicsComponent.Direction.RIGHT){
                currentFrame.flip(true, false);
            }else{
                if(currentFrame.isFlipX()){
                    currentFrame.flip(true,false);
                }
            }






        }
    }









}
