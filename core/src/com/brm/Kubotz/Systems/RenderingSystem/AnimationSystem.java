package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.Sprite;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.badlogic.gdx.utils.Array;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.SpriteComponent;
import com.brm.Kubotz.Component.Skills.DashComponent;
import com.brm.Kubotz.Component.Skills.DashComponent.Phase;
import com.brm.Kubotz.SpriteAnimation;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {


    SpriteAnimation idle = new SpriteAnimation("textures/idle.png", 1/15f);
    SpriteAnimation running = new SpriteAnimation("textures/running.png", 1/15f);

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

                spriteComp.animation = idle;
                spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }





            if(!phys.isGrounded()){
                if(phys.getVelocity().y > 0){
                    spriteComp.animation = new SpriteAnimation("textures/jumping.png", 1/15f);
                    spriteComp.animation.setPlayMode(Animation.PlayMode.NORMAL);
                }

            }else{
                if(phys.getVelocity().x != 0){
                    spriteComp.animation = this.running;
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

            }





            spriteComp.stateTime += Gdx.graphics.getDeltaTime();
            spriteComp.animation.update(spriteComp.stateTime);
            TextureRegion currentFrame = spriteComp.animation.getCurrentFrame();
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
